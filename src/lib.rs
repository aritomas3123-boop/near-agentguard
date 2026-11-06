//! Proof-of-concept NEAR on-chain reservation guard.
//! Does NOT custody money, send NEAR, or execute a payment.
use near_sdk::{env, near, AccountId, PanicOnDefault};
use std::collections::BTreeMap;

const MAX_ACTION_MILLI: u64 = 2_000; // 2 NEAR
const DAILY_LIMIT_MILLI: u64 = 10_000; // 10 NEAR
const DAY_MS: u64 = 86_400_000;

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Proposal {
    pub agent: AccountId,
    pub recipient: AccountId,
    pub nonce: String,
    pub amount_milli_near: u64,
    pub day_utc: u64,
    pub approved: bool,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct AgentGuard {
    owner: AccountId,
    daily_reserved: BTreeMap<String, u64>,
    proposals: BTreeMap<String, Proposal>,
}

#[near]
impl AgentGuard {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        // Only a transaction sent by the deployed contract ACCOUNT itself may initialize it.
        // In NEAR this requires control of that account's access key. An external caller
        // cannot seize an uninitialized contract by naming itself as owner.
        // Deploy and initialize from the same contract account, then appoint the reviewer.
        assert_eq!(
            env::predecessor_account_id(),
            env::current_account_id(),
            "Only contract account may initialize"
        );
        assert_ne!(owner, env::current_account_id(), "Reviewer must differ from contract account");
        Self { owner, daily_reserved: BTreeMap::new(), proposals: BTreeMap::new() }
    }

    /// Authenticated caller can reserve a hypothetical budget, but cannot transfer tokens.
    /// Time and nonce checks use chain state. State changes are atomic per NEAR transaction.
    pub fn propose(&mut self, nonce: String, recipient: AccountId, amount_milli_near: u64) -> String {
        let agent = env::predecessor_account_id();
        assert!(
            (6..=64).contains(&nonce.len())
                && nonce.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_'),
            "Invalid nonce"
        );
        assert!(amount_milli_near > 0 && amount_milli_near <= MAX_ACTION_MILLI, "Above per-action limit");
        let recipient_str = recipient.as_str();
        assert!(matches!(recipient_str, "api.near.ai" | "storage.near" | "audit.near"), "Recipient not allowlisted");
        let id = format!("{}:{}", agent, nonce);
        assert!(!self.proposals.contains_key(&id), "Repeated nonce");
        let day = env::block_timestamp_ms() / DAY_MS;
        let ledger_key = format!("{}:{}", agent, day);
        let already = self.daily_reserved.get(&ledger_key).copied().unwrap_or(0);
        let updated = already.checked_add(amount_milli_near).expect("Overflow");
        assert!(updated <= DAILY_LIMIT_MILLI, "Above daily limit");
        self.daily_reserved.insert(ledger_key, updated);
        self.proposals.insert(id.clone(), Proposal {
            agent, recipient, nonce, amount_milli_near, day_utc: day, approved: false,
        });
        id
    }

    /// Only the initialized owner/reviewer can approve. Approval is a *record*, not a transfer.
    pub fn approve(&mut self, id: String) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only reviewer may approve");
        let proposal = self.proposals.get_mut(&id).expect("Proposal missing");
        assert!(!proposal.approved, "Already approved");
        proposal.approved = true;
    }

    pub fn get_proposal(&self, id: String) -> Option<Proposal> {
        self.proposals.get(&id).cloned()
    }

    pub fn get_reserved_milli_near(&self, agent: AccountId, day_utc: u64) -> u64 {
        self.daily_reserved.get(&format!("{}:{}", agent, day_utc)).copied().unwrap_or(0)
    }

    pub fn owner(&self) -> AccountId { self.owner.clone() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{test_utils::VMContextBuilder, testing_env};

    fn ctx(caller: &str, day: u64) {
        let mut builder = VMContextBuilder::new();
        builder.current_account_id("guard.testnet".parse().unwrap());
        builder.predecessor_account_id(caller.parse().unwrap());
        builder.block_timestamp(day * DAY_MS * 1_000_000);
        testing_env!(builder.build());
    }
    fn init_ctx(day: u64) { ctx("guard.testnet", day); }
    fn recipient() -> AccountId { "api.near.ai".parse().unwrap() }
    #[test]
    #[should_panic(expected = "Only contract account may initialize")]
    fn cannot_front_run_initialization() {
        ctx("attacker.testnet", 10);
        AgentGuard::new("reviewer.testnet".parse().unwrap());
    }

    #[test]
    #[should_panic(expected = "Reviewer must differ from contract account")]
    fn contract_cannot_appoint_itself_as_reviewer() {
        init_ctx(10);
        AgentGuard::new("guard.testnet".parse().unwrap());
    }

    #[test]
    fn contract_account_initializes_and_appoints_different_reviewer() {
        init_ctx(10);
        let guard = AgentGuard::new("reviewer.testnet".parse().unwrap());
        assert_eq!(guard.owner(), "reviewer.testnet".parse::<AccountId>().unwrap());
    }

    #[test]
    fn basic_reservation_then_owner_approval() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        let id = c.propose("nonce-0001".to_string(), recipient(), 1250);
        assert_eq!(c.get_reserved_milli_near("agent.testnet".parse().unwrap(), 10), 1250);
        assert!(!c.get_proposal(id.clone()).unwrap().approved);
        ctx("reviewer.testnet", 10);
        c.approve(id.clone());
        assert!(c.get_proposal(id).unwrap().approved);
    }
    #[test]
    #[should_panic(expected = "Repeated nonce")]
    fn duplicate_nonce_fails() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        c.propose("nonce-0001".to_string(), recipient(), 1250);
        c.propose("nonce-0001".to_string(), recipient(), 1250);
    }
    #[test]
    #[should_panic(expected = "Above daily limit")]
    fn sixth_two_near_proposal_fails() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        for n in 0..5 { c.propose(format!("nonce-{}", n), recipient(), 2000); }
        c.propose("nonce-6".to_string(), recipient(), 2000);
    }
    #[test]
    #[should_panic(expected = "Above per-action limit")]
    fn action_exceeds_policy() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        c.propose("nonce-0002".to_string(), recipient(), 2001);
    }

    #[test]
    #[should_panic(expected = "Recipient not allowlisted")]
    fn unknown_recipient_rejected() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        c.propose("nonce-0003".to_string(), "unknown.testnet".parse().unwrap(), 100);
    }

    #[test]
    fn reservations_separated_by_day() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        for n in 0..5 { c.propose(format!("day10-{}", n), recipient(), 2000); }
        ctx("agent.testnet", 11);
        c.propose("day11-new".to_string(), recipient(), 2000);
        assert_eq!(c.get_reserved_milli_near("agent.testnet".parse().unwrap(), 10), 10000);
        assert_eq!(c.get_reserved_milli_near("agent.testnet".parse().unwrap(), 11), 2000);
    }

    #[test]
    fn reservations_separated_by_agent() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent-a.testnet", 10);
        c.propose("shared-nonce".to_string(), recipient(), 1250);
        ctx("agent-b.testnet", 10);
        c.propose("shared-nonce".to_string(), recipient(), 1500);
        assert_eq!(c.get_reserved_milli_near("agent-a.testnet".parse().unwrap(), 10), 1250);
        assert_eq!(c.get_reserved_milli_near("agent-b.testnet".parse().unwrap(), 10), 1500);
    }

    #[test]
    #[should_panic(expected = "Already approved")]
    fn cannot_approve_twice() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        let id = c.propose("nonce-0004".to_string(), recipient(), 100);
        ctx("reviewer.testnet", 10);
        c.approve(id.clone());
        c.approve(id);
    }

    #[test]
    #[should_panic(expected = "Invalid nonce")]
    fn nonce_empty_rejected() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        c.propose("".to_string(), recipient(), 100);
    }

    #[test]
    fn exact_action_and_daily_limits_are_allowed() {
        init_ctx(25);
        let mut contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 25);
        for i in 0..5 {
            contract.propose(format!("boundary-{:02}", i), recipient(), MAX_ACTION_MILLI);
        }
        assert_eq!(
            contract.get_reserved_milli_near("agent.testnet".parse().unwrap(), 25),
            DAILY_LIMIT_MILLI
        );
    }

    #[test]
    #[should_panic(expected = "Above per-action limit")]
    fn zero_amount_rejected() {
        init_ctx(10);
        let mut contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        contract.propose("nonce-zero".into(), recipient(), 0);
    }

    #[test]
    #[should_panic(expected = "Invalid nonce")]
    fn unicode_nonce_rejected() {
        init_ctx(10);
        let mut contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        contract.propose("nönce-0001".into(), recipient(), 100);
    }

    #[test]
    #[should_panic(expected = "Invalid nonce")]
    fn giant_nonce_rejected() {
        init_ctx(10);
        let mut contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        contract.propose("a".repeat(65), recipient(), 100);
    }

    #[test]
    #[should_panic(expected = "Repeated nonce")]
    fn identical_nonce_rejected_even_on_new_day() {
        init_ctx(10);
        let mut contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        contract.propose("nonce-global".into(), recipient(), 100);
        ctx("agent.testnet", 11);
        contract.propose("nonce-global".into(), recipient(), 100);
    }

    #[test]
    #[should_panic(expected = "Only reviewer may approve")]
    fn other_agent_cannot_approve() {
        init_ctx(10);
        let mut contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent-a.testnet", 10);
        let id = contract.propose("nonce-agent-a".into(), recipient(), 100);
        ctx("agent-b.testnet", 10);
        contract.approve(id);
    }

    #[test]
    fn readonly_unknown_proposal_returns_none() {
        init_ctx(10);
        let contract = AgentGuard::new("reviewer.testnet".parse().unwrap());
        assert!(contract.get_proposal("missing:nonce".into()).is_none());
        assert_eq!(contract.get_reserved_milli_near("agent.testnet".parse().unwrap(), 10), 0);
    }

    #[test]
    #[should_panic(expected = "Only reviewer may approve")]
    fn agent_cannot_self_approve() {
        init_ctx(10);
        let mut c = AgentGuard::new("reviewer.testnet".parse().unwrap());
        ctx("agent.testnet", 10);
        let id = c.propose("nonce-0001".to_string(), recipient(), 100);
        c.approve(id);
    }
}
