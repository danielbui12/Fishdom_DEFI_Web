import { Button, message, Space } from "antd";
import { ethers } from "ethers";
import React from "react";
import { useSelector } from "react-redux";
import { user$ } from "src/redux/selectors";
import FishdomMarketAbi from '../../../../constants/contracts/FishdomMarket.sol/FishdomMarket.json'
import FishdomTokenAbi from '../../../../constants/contracts/token/FishdomToken.sol/FishdomToken.json'
import axios from "axios";
import { useWeb3React } from "@web3-react/core";
import { catchErrorWallet } from "src/metamask";

function Item(props) {
	const { infoItem, onFetchData } = props;
	const { account, library } = useWeb3React()
	const userData = useSelector(user$)

	async function buyHandler() {
		try {
			const FishdomMarket = new ethers.Contract(
				FishdomMarketAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				FishdomMarketAbi.abi,
				await library.getSigner(account)
			);

			const FishdomToken = new ethers.Contract(
				FishdomTokenAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				FishdomTokenAbi.abi,
				await library.getSigner(account)
			);

			const approveTx = await FishdomToken.approve(
				FishdomMarketAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				ethers.utils.parseEther(infoItem.price)
			);
			message.loading('Waiting approve FdT', 1)
			await approveTx.wait(1);

			const buyTx = await FishdomMarket.buyMarketItem(
				infoItem.itemId
			);
			message.loading("Please wait for transaction finised...", 1);
			await buyTx.wait();
			await axios.post(
				process.env.REACT_APP_API_URL + '/Market/buy',
				{
					txHash: buyTx.hash
				},
				{
					headers: {
						Authorization: `Bearer ${userData.token}`
					}
				}
			)
		} catch (error) {
			catchErrorWallet(error)
		} finally {
			onFetchData()
		}
	}

	if (infoItem)
		return (
			<Space direction="vertical" size={16} className="market-item">
				<div className="custom-pointer">
					<img
						src={`${process.env.REACT_APP_API_URL}/NFT/idle/${infoItem.nftId}`}
						alt="Fishdom Fish"
						className="market-img"
					/>
				</div>
				<Space direction="vertical" size={12}>
					<div>
						<label className="module-title">{infoItem.name}</label>
					</div>
					<div>
						NFT ID:{" "}{infoItem.nftId}
					</div>
					<div>
						Market Item ID:{" "}{infoItem.itemId}
					</div>
					<div style={{ overflow: 'hidden' }}>
						<a href={`${process.env.REACT_APP_EXPLORE_SCAN_URL}/tx/${infoItem.txHash}`} target="_blank">
							Tx Hash:{" "}{infoItem.txHash}
						</a>
					</div>
					<div className="price">
						Price: {" "}
						{infoItem.price}{" "}FdT
					</div>

					<Button
						onClick={buyHandler}
						className="w-100"
						disabled={infoItem.seller.toLowerCase() === account?.toLowerCase()}
					>Buy</Button>
				</Space>
			</Space>
		);
	else return null;
}

export default Item;
