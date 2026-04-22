from gltest import get_contract_factory, default_account
from gltest.helpers import load_fixture
from gltest.assertions import tx_execution_succeeded, tx_execution_failed


def deploy_contract():
    factory = get_contract_factory("GothamCourt")
    contract = factory.deploy()

    # Verify initial state
    case_count = contract.get_case_count(args=[])
    assert case_count == 0

    all_cases = contract.get_all_cases(args=[])
    assert all_cases == []

    return contract


def test_file_case():
    contract = load_fixture(deploy_contract)

    defendant = "0x0000000000000000000000000000000000000001"

    result = contract.file_case(
        args=[
            defendant,
            "Rug Pull on MoonToken",
            "The defendant launched MoonToken, promised a DEX listing, collected 100 ETH, then deleted all socials and drained the LP.",
            "https://etherscan.io/address/0x0000000000000000000000000000000000000001",
        ]
    )
    assert tx_execution_succeeded(result)

    case_count = contract.get_case_count(args=[])
    assert case_count == 1

    case_data = contract.get_case(args=[0])
    assert case_data["title"] == "Rug Pull on MoonToken"
    assert case_data["status"] == "OPEN"
    assert case_data["verdict"] == ""
    assert case_data["defendant"] == defendant
    # Betting totals should be zero
    assert case_data["bet_totals"]["guilty"] == 0
    assert case_data["bet_totals"]["not_guilty"] == 0
    assert case_data["bet_totals"]["insufficient_evidence"] == 0


def test_file_case_and_judge():
    contract = load_fixture(deploy_contract)

    defendant = "0x0000000000000000000000000000000000000001"

    # File a case
    file_result = contract.file_case(
        args=[
            defendant,
            "Broken NFT Promise",
            "The defendant sold NFTs promising utility that was never delivered. Project website went offline.",
            "https://example.com/nft-project",
        ]
    )
    assert tx_execution_succeeded(file_result)

    # Submit defense (required before judgment)
    defense_result = contract.submit_defense(
        args=[
            0,
            "The NFT utility is still in development. Delays were communicated to holders via Discord.",
            "https://example.com/nft-roadmap",
        ],
        from_account=defendant,
    )
    assert tx_execution_succeeded(defense_result)

    # Verify defense was recorded
    case_data = contract.get_case(args=[0])
    assert case_data["status"] == "DEFENSE"

    # Judge the case (now that defense has been filed)
    judge_result = contract.judge_case(
        args=[0],
        wait_interval=15000,
        wait_retries=20,
    )
    assert tx_execution_succeeded(judge_result)

    # Verify verdict was recorded
    case_data = contract.get_case(args=[0])
    assert case_data["status"] == "JUDGED"
    assert case_data["verdict"] in ["GUILTY", "NOT_GUILTY", "INSUFFICIENT_EVIDENCE"]
    assert 1 <= case_data["severity"] <= 10
    assert len(case_data["reasoning"]) > 0


def test_place_bet():
    contract = load_fixture(deploy_contract)

    defendant = "0x0000000000000000000000000000000000000001"
    bettor = "0x0000000000000000000000000000000000000002"

    # File a case
    contract.file_case(
        args=[
            defendant,
            "Betting Test Case",
            "A case to test the betting feature.",
            "https://example.com/evidence",
        ]
    )

    # Place a bet on GUILTY (value=100 wei)
    bet_result = contract.place_bet(
        args=[0, "GUILTY"],
        value=100,
        from_account=bettor,
    )
    assert tx_execution_succeeded(bet_result)

    # Verify bet totals
    totals = contract.get_case_bet_totals(args=[0])
    assert totals["guilty"] == 100
    assert totals["not_guilty"] == 0
    assert totals["insufficient_evidence"] == 0

    # Verify escrow tracking
    escrow = contract.get_case_escrow(args=[0])
    assert escrow == 100

    # Verify bet data
    bet = contract.get_bet(args=[0, bettor])
    assert bet["exists"] is True
    assert bet["amount"] == 100
    assert bet["outcome"] == "GUILTY"
    assert bet["claimed"] is False

    # Add more to the same bet (same outcome)
    bet_result2 = contract.place_bet(
        args=[0, "GUILTY"],
        value=50,
        from_account=bettor,
    )
    assert tx_execution_succeeded(bet_result2)

    bet = contract.get_bet(args=[0, bettor])
    assert bet["amount"] == 150

    totals = contract.get_case_bet_totals(args=[0])
    assert totals["guilty"] == 150


def test_place_bet_guards():
    contract = load_fixture(deploy_contract)

    defendant = "0x0000000000000000000000000000000000000001"
    bettor = "0x0000000000000000000000000000000000000002"

    # File a case
    contract.file_case(
        args=[
            defendant,
            "Guard Test Case",
            "Testing bet guards.",
            "https://example.com/evidence",
        ]
    )

    # Defendant cannot bet
    defendant_bet = contract.place_bet(
        args=[0, "GUILTY"],
        value=100,
        from_account=defendant,
    )
    assert tx_execution_failed(defendant_bet)

    # Plaintiff (default account) cannot bet
    plaintiff_bet = contract.place_bet(
        args=[0, "GUILTY"],
        value=100,
    )
    assert tx_execution_failed(plaintiff_bet)

    # Invalid amount (zero value)
    zero_bet = contract.place_bet(
        args=[0, "GUILTY"],
        value=0,
        from_account=bettor,
    )
    assert tx_execution_failed(zero_bet)

    # Invalid outcome
    bad_outcome = contract.place_bet(
        args=[0, "MAYBE"],
        value=100,
        from_account=bettor,
    )
    assert tx_execution_failed(bad_outcome)

    # Cannot switch outcome
    contract.place_bet(args=[0, "GUILTY"], value=100, from_account=bettor)
    switch_bet = contract.place_bet(
        args=[0, "NOT_GUILTY"],
        value=50,
        from_account=bettor,
    )
    assert tx_execution_failed(switch_bet)


def test_claim_winnings():
    contract = load_fixture(deploy_contract)

    defendant = "0x0000000000000000000000000000000000000001"
    bettor_a = "0x0000000000000000000000000000000000000002"
    bettor_b = "0x0000000000000000000000000000000000000003"

    # File a case
    contract.file_case(
        args=[
            defendant,
            "Claim Test Case",
            "Testing claim mechanics.",
            "https://example.com/evidence",
        ]
    )

    # Submit defense
    contract.submit_defense(
        args=[0, "I am innocent.", "https://example.com/defense"],
        from_account=defendant,
    )

    # Place bets: A bets 100 wei on GUILTY, B bets 50 wei on NOT_GUILTY
    contract.place_bet(args=[0, "GUILTY"], value=100, from_account=bettor_a)
    contract.place_bet(args=[0, "NOT_GUILTY"], value=50, from_account=bettor_b)

    # Judge
    judge_result = contract.judge_case(
        args=[0],
        wait_interval=15000,
        wait_retries=20,
    )
    assert tx_execution_succeeded(judge_result)

    case_data = contract.get_case(args=[0])
    verdict = case_data["verdict"]

    # Cannot claim twice
    if verdict == "GUILTY":
        claim_a = contract.claim_winnings(args=[0], from_account=bettor_a)
        assert tx_execution_succeeded(claim_a)
        # Proportional payout: A gets (100 * 150) // 100 = 150 wei
        assert claim_a.calldata == 150

        # Double claim should fail
        claim_a2 = contract.claim_winnings(args=[0], from_account=bettor_a)
        assert tx_execution_failed(claim_a2)

        # Loser gets nothing (or their bet back if nobody won)
        claim_b = contract.claim_winnings(args=[0], from_account=bettor_b)
        assert tx_execution_succeeded(claim_b)
        assert claim_b.calldata == 0

    elif verdict == "NOT_GUILTY":
        claim_b = contract.claim_winnings(args=[0], from_account=bettor_b)
        assert tx_execution_succeeded(claim_b)
        # Proportional payout: B gets (50 * 150) // 50 = 150 wei
        assert claim_b.calldata == 150

        claim_a = contract.claim_winnings(args=[0], from_account=bettor_a)
        assert tx_execution_succeeded(claim_a)
        assert claim_a.calldata == 0

    else:
        # INSUFFICIENT_EVIDENCE — nobody bet on it, so everyone refunded
        claim_a = contract.claim_winnings(args=[0], from_account=bettor_a)
        assert tx_execution_succeeded(claim_a)
        assert claim_a.calldata == 100  # refunded original bet

        claim_b = contract.claim_winnings(args=[0], from_account=bettor_b)
        assert tx_execution_succeeded(claim_b)
        assert claim_b.calldata == 50  # refunded original bet


def test_bet_before_judgment_only():
    contract = load_fixture(deploy_contract)

    defendant = "0x0000000000000000000000000000000000000001"
    bettor = "0x0000000000000000000000000000000000000002"

    # File + defense + judge
    contract.file_case(
        args=[defendant, "Closed Betting", "Test.", "https://example.com/evidence"]
    )
    contract.submit_defense(
        args=[0, "Defense.", ""],
        from_account=defendant,
    )
    judge_result = contract.judge_case(args=[0], wait_interval=15000, wait_retries=20)
    assert tx_execution_succeeded(judge_result)

    # Betting after judgment should fail
    late_bet = contract.place_bet(
        args=[0, "GUILTY"],
        value=100,
        from_account=bettor,
    )
    assert tx_execution_failed(late_bet)
