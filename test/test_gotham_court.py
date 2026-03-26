from gltest import get_contract_factory, default_account
from gltest.helpers import load_fixture
from gltest.assertions import tx_execution_succeeded


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

    # Judge the case (without defense)
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
