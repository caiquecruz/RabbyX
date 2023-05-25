import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ParsedActionData, SendNFTRequireData, SendRequireData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import userDataDrawer from './components/UserListDrawer';
import LogoWithText from './components/LogoWithText';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import IconEdit from 'ui/assets/editpen.svg';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NameAndAddress } from '@/ui/component';
import NFTWithName from './components/NFTWithName';
import * as Values from './components/Values';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
  }
  .icon-edit-alias {
    width: 13px;
    height: 13px;
    cursor: pointer;
  }
  .icon-scam-token {
    margin-left: 4px;
    width: 13px;
  }
  .icon-fake-token {
    margin-left: 4px;
    width: 13px;
  }
  li .name-and-address {
    justify-content: flex-start;
    .address {
      font-weight: 400;
      font-size: 12px;
      line-height: 14px;
      color: #999999;
    }
    img {
      width: 12px !important;
      height: 12px !important;
      margin-left: 4px !important;
    }
  }
`;

const SendNFT = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['sendNFT'];
  requireData: SendNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const {
    userData,
    rules,
    processedRules,
    transferWhitelist,
    transferWhiteEnable,
  } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
    transferWhitelist: s.whitelist.whitelist,
    transferWhiteEnable: s.whitelist.enabled,
  }));

  const receiverInWhitelist = useMemo(() => {
    return userData.addressWhitelist.includes(actionData.to.toLowerCase());
  }, [userData, actionData]);
  const receiverInBlacklist = useMemo(() => {
    return userData.addressBlacklist.includes(actionData.to.toLowerCase());
  }, [userData, actionData]);

  const receiverType = useMemo(() => {
    if (requireData.contract) {
      return 'Contract';
    }
    if (requireData.eoa) {
      return 'EOA';
    }
    if (requireData.cex) {
      return 'EOA';
    }
  }, [requireData]);

  const contractOnCurrentChain = useMemo(() => {
    if (!requireData.contract || !requireData.contract[chain.serverId])
      return null;
    return requireData.contract[chain.serverId];
  }, [requireData, chain]);

  const timeSpan = useMemo(() => {
    let bornAt = 0;
    if (requireData.contract) {
      if (contractOnCurrentChain) {
        bornAt = contractOnCurrentChain.create_at;
      } else {
        return '-';
      }
    }
    if (requireData.cex) bornAt = requireData.cex.bornAt;
    if (requireData.eoa) bornAt = requireData.eoa.bornAt;
    const { d, h, m } = getTimeSpan(Math.floor(Date.now() / 1000) - bornAt);
    if (d > 0) {
      return `${d} Day${d > 1 ? 's' : ''} ago`;
    }
    if (h > 0) {
      return `${h} Hour${h > 1 ? 's' : ''} ago`;
    }
    if (m > 1) {
      return `${m} Minutes ago`;
    }
    return '1 Minute ago';
  }, [requireData]);

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    const result = engineResultMap[id];
    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

  const handleEditReceiverMark = () => {
    userDataDrawer({
      address: actionData.to,
      onWhitelist: receiverInWhitelist,
      onBlacklist: receiverInBlacklist,
      async onChange({ onWhitelist, onBlacklist }) {
        if (onWhitelist && !receiverInWhitelist) {
          await wallet.addAddressWhitelist(actionData.to);
        }
        if (onBlacklist && !receiverInBlacklist) {
          await wallet.addAddressBlacklist(actionData.to);
        }
        if (
          !onBlacklist &&
          !onWhitelist &&
          (receiverInBlacklist || receiverInWhitelist)
        ) {
          await wallet.removeAddressBlacklist(actionData.to);
          await wallet.removeAddressWhitelist(actionData.to);
        }
        dispatch.securityEngine.init();
      },
    });
  };

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Send NFT</Row>
          <Row>
            <NFTWithName nft={actionData?.nft}></NFTWithName>
            <ul className="desc-list">
              <li>{actionData?.nft?.collection?.name}</li>
              <li>
                Floor price {/* todo */}
                {requireData?.collection?.floor_price ? (
                  <>
                    {/* <Values.TokenAmount
                      value={requireData?.collection?.floor_price}
                    /> */}
                    {formatAmount(requireData?.collection?.floor_price, 2)}
                    {chain.nativeTokenSymbol}
                  </>
                ) : (
                  '-'
                )}
              </li>
              {actionData?.nft?.amount > 1 && (
                <li>Amount: {actionData?.nft?.amount}</li>
              )}
              <li>
                <NameAndAddress
                  address={actionData?.nft?.contract_id}
                  chainEnum={chain?.enum}
                  openExternal
                />
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">{ellipsis(actionData.to)}</div>
        <div className="right">send to</div>
      </div>
      <Table>
        {requireData.cex && (
          <Col>
            <Row isTitle>CEX</Row>
            <Row>
              <LogoWithText
                logo={requireData.cex.logo}
                text={requireData.cex.name}
              />
              {(!requireData.cex.isDeposit ||
                !requireData.cex.supportToken) && (
                <ul className="desc-list">
                  {!requireData.cex.isDeposit && (
                    <li>
                      Non top up address
                      {engineResultMap['1039'] && (
                        <SecurityLevelTagNoText
                          level={
                            processedRules.includes('1039')
                              ? 'proceed'
                              : engineResultMap['1039'].level
                          }
                          onClick={() => handleClickRule('1039')}
                        />
                      )}
                    </li>
                  )}
                  {!requireData.cex.supportToken && (
                    <li>
                      {/* {ellipsisTokenSymbol(actionData.token.symbol)} not
                      supported */}
                      {engineResultMap['1038'] && (
                        <SecurityLevelTagNoText
                          level={
                            processedRules.includes('1038')
                              ? 'proceed'
                              : engineResultMap['1038'].level
                          }
                          onClick={() => handleClickRule('1038')}
                        />
                      )}
                    </li>
                  )}
                </ul>
              )}
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Type</Row>
          <Row>
            {receiverType}
            {contractOnCurrentChain && (
              <ul className="desc-list">
                {contractOnCurrentChain.multisig && <li>MultiSig: Safe</li>}
              </ul>
            )}
            {engineResultMap['1037'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1037')
                    ? 'proceed'
                    : engineResultMap['1037'].level
                }
                onClick={() => handleClickRule('1037')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>
            {requireData.contract ? 'Deployed' : 'First on-chain'}
          </Row>
          <Row>{timeSpan}</Row>
        </Col>
        <Col>
          <Row isTitle>Balance</Row>
          <Row>{formatUsdValue(requireData.usd_value)}</Row>
        </Col>
        <Col>
          <Row isTitle>Transacted before</Row>
          <Row>
            {requireData.hasTransfer ? 'Yes' : 'No'}
            {engineResultMap['1036'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1036')
                    ? 'proceed'
                    : engineResultMap['1036'].level
                }
                onClick={() => handleClickRule('1036')}
              />
            )}
          </Row>
        </Col>
        {transferWhiteEnable && (
          <Col>
            <Row isTitle>Whitelist</Row>
            <Row>
              {transferWhitelist.includes(actionData.to.toLowerCase())
                ? 'On my whitelist'
                : 'Not on my whitelist'}
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={actionData.to} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <div className="flex">
              <span className="mr-6">
                {receiverInWhitelist && 'Trusted'}
                {receiverInBlacklist && 'Blocked'}
                {!receiverInBlacklist && !receiverInWhitelist && 'No mark'}
              </span>
              <img
                src={IconEdit}
                className="icon-edit-alias icon"
                onClick={handleEditReceiverMark}
              />
            </div>
            {engineResultMap['1042'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1042')
                    ? 'proceed'
                    : engineResultMap['1042'].level
                }
                onClick={() => handleClickRule('1042')}
              />
            )}
            {engineResultMap['1041'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1041')
                    ? 'proceed'
                    : engineResultMap['1041'].level
                }
                onClick={() => handleClickRule('1041')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default SendNFT;
