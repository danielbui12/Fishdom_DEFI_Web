import { DownOutlined } from "@ant-design/icons";
import { useWeb3React } from "@web3-react/core";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import IconWallet from "../../assets/png/topbar/icon-wallet-white.svg";
import Container from "../grid/Container";
import MenuTop from "./MenuTop";
import ModalWallet from "./ModalWallet";
import { useSelector } from 'react-redux'
import { user$ } from "src/redux/selectors";
import _ from "lodash";
import { connectorsByName } from "src/connector";

function Topbar() {
  const navigate = useNavigate();
  const { account, active, activate } = useWeb3React();

  const [isShowWallet, setShowWallet] = useState(false);

  const userData = useSelector(user$)
  const isLoggedIn = !_.isEmpty(userData)

  const goHome = () => {
    navigate("/");
  };

  const showWallet = () => {
    setShowWallet(true);
  };

  useEffect(() => {
    const selectedWallet = localStorage.getItem('selectedWallet')
    if (selectedWallet) {
      activate(connectorsByName[selectedWallet])
    }
  }, [])
  
  useEffect(() => {
    const ethereum = window.ethereum
    if (ethereum) {
      const handleAccountsChanged = (accounts /*: string[] */) => {
        console.log("Handling 'accountsChanged' event with payload", accounts);
        if (accounts.length > 0) {
          window.location.reload()
          localStorage.removeItem('fd_user')
        }
      };
  
      ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    }
  }, [])

  return (
    <Container>
      <div id="menu">
        <div className="logo logo-pc" onClick={goHome} data-aos="fade-down" />
        <div className="top-layout" data-aos="fade-right">
          {isShowWallet ? (
            <ModalWallet
              isModalVisible={isShowWallet}
              hideWallet={() => setShowWallet(false)}
            />
          ) : null}
          <MenuTop />
          {(active && isLoggedIn) ? (
            <div className="wallet-address">
            <img src={IconWallet} />

            <p>{account}</p>
            <DownOutlined />
            <div className="tooltip">
              <span onClick={showWallet}>Switch Wallet</span>
              <span onClick={() => navigate('/profile')}>Profile</span>
            </div>
          </div>
          ) : (
            <div className="wallet-button" onClick={showWallet}>
            <img src={IconWallet} />
            <span>Connect Wallet</span>
          </div>
          )}
        </div>
      </div>
    </Container>
  );
}

export default Topbar;
