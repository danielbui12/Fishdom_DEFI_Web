import { Button, Col, Empty, message, Pagination, Row, Spin, Tabs } from "antd";
import { ethers } from "ethers";
import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import ModalWallet from "src/layout/Topbar/ModalWallet";
import { user$ } from "src/redux/selectors";
import IconWallet from "../../../assets/png/topbar/icon-wallet-white.svg";
import MarketAbi from "../../../constants/contracts/FishdomMarket.sol/FishdomMarket.json";
import FishdomNFTAbi from "../../../constants/contracts/FishdomNFT.sol/FishdomNFT.json";
import Container from "../../../layout/grid/Container";
import MarketItem from "./MarketItem";
import ModalConfirm from "./ModalConfirm";
import axios from "axios";
import { useWeb3React } from "@web3-react/core";
import { catchErrorWallet } from "src/metamask";

const Collection = () => {
	const userData = useSelector(user$)
	const { library, account } = useWeb3React()
	const [listMarket, setListMarket] = useState({
		data: [],
		total: 0,
	});
	const [listCollection, setListCollection] = useState({
		data: [],
		total: 0,
	});
	const [currentPage, setCurrentPage] = useState(1);
	const page_size = 8;
	const [currentTabKey, setCurrentTabKey] = useState("#marketItem");
	const [isShowModal, setIsShowModal] = useState(false);
	const [selectedItem, setSelectedItem] = useState();
	const [sellLoading, setSellLoading] = useState(false);
	const [withdrawLoading, setWithdrawLoading] = useState(false);

	const [isLoadingAllSiteA, setIsLoadingAllSiteA] = useState(false);
	const [isLoadingAllSiteB, setIsLoadingAllSiteB] = useState(false);

	const [showPopupWallet, setShowPopupWallet] = useState(false);

	useEffect(() => {
		window.scrollTo(0, 0);
		handleChangeKey(currentTabKey)
	}, [currentTabKey, userData]);

	async function handleFetchDataMarket(nextSkip) {
		try {
			if (!(userData && userData.token)) {
				return
			}
			setIsLoadingAllSiteA(true);
			axios.post(
				process.env.REACT_APP_API_URL + "/Market/getCollection",
				{
					skip: nextSkip,
					limit: page_size
				},
				{
					headers: {
						Authorization: `Bearer ${userData.token}`
					}
				}
			).then(res => {
				setListMarket(res.data.data)
				setIsLoadingAllSiteA(false);
			})
		} catch (error) {
			setIsLoadingAllSiteA(false);
		}
	}

	async function handleFetchDataCollection(skip) {
		try {
			if (!(userData && userData.token)) {
				return
			}
			setIsLoadingAllSiteB(true);
			axios.post(
				process.env.REACT_APP_API_URL + "/NFT/getCollection",
				{
					"limit": page_size,
					"skip": skip
				},
				{
					headers: {
						Authorization: `Bearer ${userData.token}`
					}
				}
			).then(res => {
				setListCollection(res.data.data);
				setIsLoadingAllSiteB(false);
			})
		} catch (error) {
			setIsLoadingAllSiteB(false);
		}
	}

	const handleChangeKey = useCallback(async (key) => {
		setCurrentPage(1);
		if (key === "#marketItem") {
			await handleFetchDataMarket(0);
		} else {
			await handleFetchDataCollection(0);
		}
		window.location.hash = key
		currentTabKey !== key && setCurrentTabKey(key);
	}, [currentTabKey, userData])

	async function handleSellItem(values) {
		try {
			setSellLoading(true);
			const MarketContract = new ethers.Contract(
				MarketAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				MarketAbi.abi,
				await library.getSigner(account)
			);

			const FishdomNFTContract = new ethers.Contract(
				FishdomNFTAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				FishdomNFTAbi.abi,
				await library.getSigner(account)
			);

			const approveRes = await FishdomNFTContract.approve(
				MarketAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				values.nftId
			);
			message.loading("Please wait for approve transaction", 1)
			await approveRes.wait();
			window.open(`${process.env.REACT_APP_EXPLORE_SCAN_URL}/tx/${approveRes.hash}`)

			const priceToWei = ethers.utils.parseEther(values.price).toString();
			const createMarket = await MarketContract.createMarketItem(
				values.nftId,
				priceToWei
			);
			await createMarket
				.wait()
				.then(() => {
					axios.post(
						process.env.REACT_APP_API_URL + "/Market/sell",
						{
							txHash: createMarket.hash
						},
						{
							headers: {
								Authorization: `Bearer ${userData.token}`
							}
						}
					).then(() => {
						handleChangeKey("#marketItem");
						message.success("Sell item successfully");
						window.open(`${process.env.REACT_APP_EXPLORE_SCAN_URL}/tx/${createMarket.hash}`)
						setIsShowModal(false);
					}).catch(() => {
						message.error("Something went wrong. Please try again");
					})
					setSellLoading(false);
				})
				.catch(() => {
					message.error("Something went wrong. Please try again");
					setSellLoading(false);
				});
		} catch (error) {
			catchErrorWallet(error);
			setSellLoading(false);
		}
	}
	async function handleWithdrawItem(itemMarketId) {
		try {
			const MarketContract = new ethers.Contract(
				MarketAbi.networks[process.env.REACT_APP_NETWORK_ID].address,
				MarketAbi.abi,
				await library.getSigner(account)
			);

			setWithdrawLoading(true);
			const withdrawRes = await MarketContract.withdrawNFT(itemMarketId);
			message.loading("Please wait for transaction be confirmed", 1)
			await withdrawRes
				.wait()
				.then(() => {
					axios.post(
						process.env.REACT_APP_API_URL + "/Market/withdraw",
						{
							txHash: withdrawRes.hash
						},
						{
							headers: {
								Authorization: `Bearer ${userData.token}`
							}
						}
					).then(() => {
						window.open(`${process.env.REACT_APP_EXPLORE_SCAN_URL}/tx/${withdrawRes.hash}`)
						message.success("Withdraw item successfully");
						handleFetchDataMarket(0)
					})
					setWithdrawLoading(false);
				})
				.catch((error) => {
					catchErrorWallet(error)
					setWithdrawLoading(false);
				});
		} catch (error) {
			setWithdrawLoading(false);
			if (error.code == 4001) {
				message.error("Transaction cancelled");
			} else {
				message.error("Something went wrong. Please try again");
			}
			console.log("withdraw error", error);
		}
	}

	return (
		<>
			<section className="section" id="section-win-market">
				<Container>
					<div className="module-header text-center">Your collection</div>
					{!(userData && userData.token) ? (
						<>
							<ModalWallet
								isModalVisible={showPopupWallet}
								hideWallet={() => setShowPopupWallet(false)}
							/>
							<div
								style={{
									width: "100%",
									display: "flex",
									justifyContent: "center",
									marginTop: "3em",
								}}
							>
								<Button
									onClick={() => {
										setShowPopupWallet(true);
									}}
								>
									<div className="wallet-button">
										<img src={IconWallet} />
										<span> Connect Wallet </span>
									</div>
								</Button>
							</div>
						</>
					) : (
						<>
							<Tabs
								type="card"
								activeKey={currentTabKey}
								defaultActiveKey={currentTabKey}
								onChange={handleChangeKey}
							>
								<Tabs.TabPane tab="Market Item" key="#marketItem">
									{(isLoadingAllSiteA && currentTabKey == "#marketItem") ||
										(isLoadingAllSiteB && currentTabKey == "#collectionItem") ? (
										<div className="flex justify-center">
											<Spin />
										</div>
									) : (
										<Row justify="center" align="middle">
											{Object.keys(listMarket?.data).length > 0 ? (
												listMarket.data.map((item, index) => {
													return (
														<Col
															xl={6}
															lg={8}
															md={12}
															sm={24}
															xs={24}
															key={index}
														>
															<MarketItem
																infoItem={item}
																// key={item.tokenId}
																currentTabKey={currentTabKey}
																isLoading={withdrawLoading}
																title="Withdraw"
																onClick={(data) => {
																	handleWithdrawItem(data.itemId);
																}}
															/>
														</Col>
													);
												})
											) : (
												<>
													<Empty />
												</>
											)}
										</Row>
									)}
								</Tabs.TabPane>
								<Tabs.TabPane tab="In Stock" key="#collectionItem">
									{(isLoadingAllSiteA && currentTabKey == "#marketItem") ||
										(isLoadingAllSiteB && currentTabKey == "#collectionItem") ? (
										<div className="flex justify-center">
											<Spin />
										</div>
									) : (
										<Row justify="center" align="middle">
											{Object.keys(listCollection?.data).length > 0 ? (
												listCollection.data.map((item, idx) => {
													return (
														<Col
															xl={6}
															lg={8}
															md={12}
															sm={24}
															xs={24}
															key={idx}
														>
															<MarketItem
																infoItem={item}
																title="Sell"
																disabled={item?.nftId === userData?.selectedNFT}
																currentTabKey={currentTabKey}
																onClick={(data) => {
																	setIsShowModal(true);
																	setSelectedItem(data);
																}}
															/>
														</Col>
													);
												})
											) : (
												<>
													<Empty />
												</>
											)}
										</Row>
									)}
								</Tabs.TabPane>
							</Tabs>
							{
								(
									(currentTabKey === "#marketItem" && listMarket.total) ||
									(currentTabKey === "#collectionItem" && listCollection.total)
								)
									? (
										<div className="pagination">
											<Pagination
												total={
													currentTabKey === "#collectionItem"
														? listCollection.total
														: listMarket.total
												}
												pageSize={page_size}
												current={currentPage}
												onChange={(num) => {
													window.scrollTo(0, 0);
													setCurrentPage(num);
													let pageSize = page_size;
													const nextSkip = (num - 1) * pageSize;
													if (currentTabKey !== "#collectionItem") {
														handleFetchDataMarket(nextSkip);
													} else {
														handleFetchDataCollection(nextSkip);
													}
												}}
											/>
										</div>
									) : (<></>)
							}
						</>
					)}
				</Container>
			</section>
			<ModalConfirm
				isShowModal={isShowModal}
				data={selectedItem}
				setShowModal={setIsShowModal}
				onClick={handleSellItem}
				isLoading={sellLoading}
			/>
		</>
	);
};

export default Collection;
