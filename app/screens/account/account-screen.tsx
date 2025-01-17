import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Image,
  Alert,
  Share,
  ScrollView,
  Linking,
} from 'react-native'
import { Avatar, Button, Card, Icon, ListItem, Text } from '@rneui/themed'
import * as Keychain from '../../utils/keychain'
import Toast from 'react-native-toast-message'
import { chainApi } from '@functionland/react-native-fula'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SharedElement } from 'react-navigation-shared-element'
import { Picker } from '@react-native-picker/picker'
import { Screen } from '../../components'
import {
  Header,
  HeaderArrowBack,
  HeaderAvatar,
  HeaderRightContainer,
} from '../../components/header'
import { AppNavigationNames, RootStackParamList } from '../../navigators'
import * as helper from '../../utils/helper'
import { useRecoilState } from 'recoil'
import {
  dIDCredentialsState,
  fulaPeerIdState,
  fulaAccountState,
  fulaPoolIdState,
  fulaPoolCreatorState,
  fulaAccountSeedState,
} from '../../store'
import Clipboard from '@react-native-clipboard/clipboard'
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import { getChainName } from '../../utils/walletConnectConifg'
import notifee from '@notifee/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<
  RootStackParamList,
  AppNavigationNames.AccountScreen
>

export const AccountScreen: React.FC<Props> = ({ navigation }) => {
  const [dIDCredentials, setDIDCredentialsState] =
    useRecoilState(dIDCredentialsState)
  const [fulaAccount, setFulaAccount] = useRecoilState(fulaAccountState)
  const [fulaPoolId, setFulaPoolId] = useRecoilState(fulaPoolIdState)
  const [fulaPoolCreator, setFulaPoolCreator] = useRecoilState(fulaPoolCreatorState)
  const [fulaAccountSeed, setFulaAccountSeed] =
    useRecoilState(fulaAccountSeedState)
    const { open, isConnected, provider, address } = useWalletConnectModal()

  const [fulaPeerId, setFulaPeerId] = useRecoilState(fulaPeerIdState)
  const [did, setDID] = useState(null)
  const [poolOptions, setPoolOptions] = useState([])
  const [cid, setCid] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(null);
  const getCid = async () => {
    try {
      const cid_ = await AsyncStorage.getItem('@lastUploadedCid');
      if (cid_ !== null) {
        setCid(cid_)
      }
    } catch (e) {
      // error reading value
    }
  };

  const getPk = async () => {
    try {
      const _pk = await helper.getMyDIDKeyPair(dIDCredentials.username, dIDCredentials.password);
      const identity = _pk.secretKey.toString();
      if (identity) {
        setPk(identity)
      }
    } catch (e) {
      // error reading value
    }
  };

  useEffect(() => {
    if (!fulaPeerId) {
      loadPeerId()
    }
    if (!fulaAccount) {
      loadFulaAccountSeed()
    }

    const fetchFulaAccountSeed = async () => {
      if (!fulaAccountSeed) {
        const fulaAcountSeedObj = await helper.getFulaAccountSeed()
        if (fulaAcountSeedObj) {
          setFulaAccountSeed(fulaAcountSeedObj.password)
        }
      }
    }

    const fetchPoolsAndSetPoolId = async () => {
      try {
        const api = await chainApi.init()
        const pools = await chainApi.listPools(api, 1, 30)
        setPoolOptions(pools.pools as any)

        // Fetch and set the fulaPoolId only after the poolOptions are available
        const fulaPoolIdObj = await helper.getFulaPoolId()
        if (fulaPoolIdObj) {
          setFulaPoolId(parseInt(fulaPoolIdObj.password, 10))
        }
      } catch (error) {
        console.error('Error fetching pools:', error)
      }
    }
    fetchFulaAccountSeed()
    fetchPoolsAndSetPoolId()
  }, [])

  useEffect(() => {
    const saveFulaPoolCreator = async (poolId: number) => {
      console.log(
        'fetching poolCreator for fulaPoolId=' + poolId,
      )

      if (
        poolId &&
        poolId.toString() != '0'
      ) {
        console.log('selected pool: ' + poolId.toString())
        let poolCreator = await helper.getPoolCreatorPeerId(poolId)
        console.log('fula pool creator is: '+ poolCreator)
        if (poolCreator) {
          await Keychain.save(
            'fulaPoolCreator',
            poolCreator,
            Keychain.Service.FULAPoolCreatorObject,
          )
          setFulaPoolCreator(poolCreator)
        }
      }
    }

    const saveFulaPoolId = async () => {
      let _poolId = '0'
      let _poolCreator = ''
      let _resetPoolCreator = false
      console.log(
        'fetching last poolId in savePoolId with fulaPoolId=' + fulaPoolId,
      )
      const fulaPoolIdObj = await helper.getFulaPoolId()
      if (fulaPoolIdObj) {
        console.log(fulaPoolIdObj)
        _poolId = fulaPoolIdObj.password
      }

      if (
        fulaPoolId &&
        fulaPoolId.toString() != '0' &&
        _poolId != fulaPoolId.toString() &&
        poolOptions.length
      ) {
        console.log('saving selected fula poolId' + fulaPoolId.toString())
        await Keychain.save(
          'fulaPoolId',
          fulaPoolId.toString(),
          Keychain.Service.FULAPoolIdObject,
        )
        await Keychain.reset(
          Keychain.Service.FULAPoolCreatorObject,
        )
        setFulaPoolCreator('')
        _resetPoolCreator = true
      }
      const fulaPoolCreatorObj = await helper.getFulaPoolCreator()
      if (fulaPoolCreatorObj && !_resetPoolCreator) {
        console.log(fulaPoolCreatorObj)
        _poolCreator = fulaPoolCreatorObj.password
        if (_poolCreator) {
          setFulaPoolCreator(_poolCreator)
        }
      }
      console.log('poolCreator at launch is: '+_poolCreator)
      if (!_poolCreator && fulaPoolId && fulaPoolId.toString() != '0') {
        await saveFulaPoolCreator(fulaPoolId)
      }
    }

    saveFulaPoolId()
  }, [fulaPoolId])

  useEffect(() => {
    // Define an asynchronous function inside the useEffect
    const fetchData = async () => {
      if (dIDCredentials?.username && dIDCredentials?.password) {
        const myDID = helper.getMyDID(
          dIDCredentials.username,
          dIDCredentials.password,
        )
        setDID(myDID)
        console.log('did was set')
        const keyPair = helper.getMyDIDKeyPair(
          dIDCredentials.username,
          dIDCredentials.password,
        )
        const secretSeed = keyPair.secretKey.toString()
        console.log('secretSeed was set' + secretSeed)
        if (secretSeed && !fulaAccount) {
          const fulaAccountSeed = await chainApi.createHexSeedFromString(
            secretSeed,
          )
          if (fulaAccountSeed) {
            const _fulaAccount = chainApi.getLocalAccount(fulaAccountSeed)
            setFulaAccount(_fulaAccount?.account)
          }
        }
      }
    }

    // Call the async function
    fetchData()
  }, [dIDCredentials])

  const loadPeerId = async () => {
    const peerIdObj = await helper.getFulaPeerId()
    if (peerIdObj) {
      setFulaPeerId(peerIdObj)
    }
  }

  const loadFulaAccountSeed = async () => {
    const fulaAccountSeedObj = await helper.getFulaAccountSeed()
    if (fulaAccountSeedObj) {
      if (fulaAccountSeedObj?.password) {
        const _fulaAccount = chainApi.getLocalAccount(
          fulaAccountSeedObj?.password,
        )
        setFulaAccount(_fulaAccount?.account)
      }
    }
  }
  const clearPool = async () => {
    console.log('clearing pool selection')
    setFulaPoolId(0)
    setFulaPoolCreator('')
    await Keychain.reset(
      Keychain.Service.FULAPoolIdObject,
    )
    await Keychain.reset(
      Keychain.Service.FULAPoolCreatorObject,
    )

  }

  const connectToWallet = async () => {
    await notifee.requestPermission()
    notifee.registerForegroundService(async () => {})
    await notifee.createChannel({
      id: 'sticky',
      name: 'Sticky Channel'
    })
    await notifee.displayNotification({
    id: 'wallet',
      title: 'warmup',
      body: 'warmup',
      android: {
        progress: {
          indeterminate: true
        },
        pressAction: {
          id: 'default'
        },
        ongoing: true,
        asForegroundService: true,
        channelId: 'sticky'
      }
    })
    notifee.stopForegroundService()
    navigation.navigate(AppNavigationNames.CreateDIDScreen)
  }
  const signWalletAddress = async () => {
    navigation.navigate(AppNavigationNames.CreateDIDScreen)
  }
  const disconnectWallet = async () => {
    Alert.alert(
      'Disconnect wallet!',
      'Are you sure want to disconnect your wallet?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await provider?.disconnect()
              await Keychain.reset(Keychain.Service.DIDCredentials)
            } catch (error) {
              console.log(error)
              Toast.show({
                type: 'error',
                text1: 'Unable to disconnect wallet',
                position: 'bottom',
                bottomOffset: 0,
              })
            } finally {
              setDIDCredentialsState(null)
              setDID(null)
              setFulaAccount('')
            }
          },
        },
      ],
    )
  }
  const shareDID = async () => {
    try {
      if (did) {
        await Share.share({
          title: 'FxFotos | Did identity',
          message: did,
        })
      }
    } catch (error) {
      console.log(error)
    }
  }
  const copyToClipboardDID = (didCp: string) => {
    Clipboard.setString(didCp)
    Toast.show({
      type: 'success',
      text1: 'Your DID copied to the clipboard!',
      position: 'bottom',
      bottomOffset: 0,
    })
  }
  const copyToClipboardFulaAccount = (fulaAccountCp: string) => {
    Clipboard.setString(fulaAccountCp)
    Toast.show({
      type: 'success',
      text1: 'Your Fula Account copied to the clipboard!',
      position: 'bottom',
      bottomOffset: 0,
    })
  }
  const copyToClipboardPeerId = (peerId: string) => {
    Clipboard.setString(peerId)
    Toast.show({
      type: 'success',
      text1: 'Your peerId copied to the clipboard!',
      position: 'bottom',
      bottomOffset: 0,
    })
  }
  const authorizeApp = () => {
    const url = `fxblox://connectdapp/FxFotos/land.fx.fotos/${
      fulaPeerId?.password
    }/${encodeURIComponent(
      'fotos://addblox/$bloxName/$bloxPeerId',
    )}/${fulaAccount}`
    console.log('Authorize app by FxBlox url is:' + url)
    Linking.openURL(url)
  }
  const renderHeader = () => (
    <Header
      centerComponent={
        <Text lineBreakMode="tail" h4>
          Account
        </Text>
      }
      leftComponent={<HeaderArrowBack navigation={navigation as any} />}
      rightComponent={
        <HeaderRightContainer>
          {isConnected && (
            <Icon
              type="material-community"
              size={28}
              style={styles.headerIcon}
              name="account-off-outline"
              onPress={disconnectWallet}
            />
          )}
          {did && (
            <Icon
              type="material-community"
              size={26}
              style={styles.headerIcon}
              name="share-variant-outline"
              onPress={shareDID}
            />
          )}
        </HeaderRightContainer>
      }
    />
  )
  const copyToClipboardCID = (cidValue: string) => {
    Clipboard.setString(cidValue);
    Toast.show({
      type: 'success',
      text1: 'Your CID copied to the clipboard!',
      position: 'bottom',
      bottomOffset: 0,
    });
  };
  const renderCIDListItem = () => (
    <ListItem onPress={() => cid && copyToClipboardCID(cid)} containerStyle={{ width: '100%' }}>
      <ListItem.Content>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Card.Title style={{ textAlign: 'left', paddingRight: 10 }}>
              YOUR CONTENT ROOT
            </Card.Title>
            <Icon name="content-copy" type="material-community" onPress={() => cid && copyToClipboardCID(cid)} />
          </View>
          <Icon name="refresh" type="material-community" onPress={getCid} />
        </View>
        <ListItem.Subtitle>{cid || 'No CID Available'}</ListItem.Subtitle>
      </ListItem.Content>
    </ListItem>
  );

  const copyToClipboardPrivateKey = (pkValue: string) => {
    Clipboard.setString(pkValue);
    Toast.show({
      type: 'success',
      text1: 'Your Private Key copied to the clipboard!',
      position: 'bottom',
      bottomOffset: 0,
    });
  };
  const renderPrivateKeyListItem = () => (
    <ListItem onPress={() => cid && copyToClipboardPrivateKey(pk)} containerStyle={{ width: '100%' }}>
      <ListItem.Content>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Card.Title style={{ textAlign: 'left', paddingRight: 10 }}>
              Private Key
            </Card.Title>
            <Icon name="content-copy" type="material-community" onPress={() => pk && copyToClipboardPrivateKey(pk)} />
          </View>
          <Icon name="refresh" type="material-community" onPress={getPk} />
        </View>
        <ListItem.Subtitle>{pk || 'No Private Key Available'}</ListItem.Subtitle>
      </ListItem.Content>
    </ListItem>
  );
  return (
    <Screen preset="scroll" style={styles.screen}>
      {renderHeader()}
      <ScrollView>
        <View style={styles.container}>
          <SharedElement id="AccountAvatar">
            <HeaderAvatar
              size={100}
              iconSize={80}
              connected={(fulaAccount && fulaPeerId)?true:false}
            />
          </SharedElement>

          {fulaAccount && fulaPeerId ? (
            <>
              <View style={styles.section}>
                {address ? (
                  <>
                    <Text ellipsizeMode="tail" style={styles.textCenter}>
                      {address}
                    </Text>
                  </>
                ) : (
                  !dIDCredentials &&
                  address && (
                    <Button
                      title="Link to Account"
                      onPress={signWalletAddress}
                    />
                  )
                )}
              </View>

              {did && (
                <View style={styles.section}>
                  <ListItem
                    onPress={() => copyToClipboardDID(did)}
                    containerStyle={{ width: '100%' }}
                  >
                    <ListItem.Content>
                      <View style={{ flexDirection: 'row' }}>
                        <Card.Title
                          style={{
                            textAlign: 'left',
                            paddingRight: 10,
                          }}
                        >
                          YOUR DID
                        </Card.Title>
                        <Icon name="content-copy" type="material-community" />
                      </View>
                      <ListItem.Subtitle> {did}</ListItem.Subtitle>
                    </ListItem.Content>
                  </ListItem>
                  {renderCIDListItem()}
                  {renderPrivateKeyListItem()}
                  <ListItem
                    onPress={() =>
                      fulaAccount
                        ? copyToClipboardFulaAccount(fulaAccount)
                        : null
                    }
                    containerStyle={{ width: '100%' }}
                  >
                    <ListItem.Content>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Card.Title
                            style={{
                              textAlign: 'left',
                              paddingRight: 10,
                            }}
                          >
                            Fula Account
                          </Card.Title>
                          <Icon name="content-copy" type="material-community" onPress={() => fulaAccount ? copyToClipboardFulaAccount(fulaAccount) : null} />
                        </View>
                        {/* New Icon for opening the browser with accountId */}
                        <Icon
                          name="open-in-new"
                          type="material-community"
                          onPress={() => fulaAccount && Linking.openURL(`https://fund.functionyard.fula.network?appId=land.fx.fotos&accountId=${fulaAccount}`)}
                        />
                      </View>
                      <ListItem.Subtitle>{fulaAccount}</ListItem.Subtitle>
                    </ListItem.Content>
                  </ListItem>
                  <ListItem
                    onPress={() =>
                      fulaPeerId
                        ? copyToClipboardPeerId(fulaPeerId.password)
                        : null
                    }
                    containerStyle={{ width: '100%' }}
                  >
                    <ListItem.Content>
                      <View style={{ flexDirection: 'row' }}>
                        <Card.Title
                          style={{
                            textAlign: 'left',
                            paddingRight: 10,
                          }}
                        >
                          YOUR PEERID
                        </Card.Title>
                        {fulaPeerId?.password && (
                          <Icon name="content-copy" type="material-community" />
                        )}
                      </View>
                      <ListItem.Subtitle>
                        {fulaPeerId?.password}
                      </ListItem.Subtitle>
                    </ListItem.Content>
                  </ListItem>
                  <ListItem containerStyle={{ width: '100%', display: 'none' }}>
                    <ListItem.Content>
                      <ListItem.Subtitle>
                        <View style={styles.section}>
                          {fulaPeerId?.password && false && (
                            <Button
                              title="Authorize FxFotos by FxBlox"
                              onPress={authorizeApp}
                            />
                          )}
                        </View>
                      </ListItem.Subtitle>
                    </ListItem.Content>
                  </ListItem>
                  <ListItem containerStyle={{ width: '100%' }}>
                    <View style={[{ width: '100%', height: 50 }]}>
                      {fulaPeerId?.password && (
                        <Picker
                          selectedValue={fulaPoolId}
                          onValueChange={(itemValue, itemIndex) =>
                            setFulaPoolId(itemValue)
                          }
                          style={[{ width: '100%', height: 50 }]}
                        >
                          <Picker.Item
                            style={[{ width: '100%', height: 50 }]}
                            key={-1}
                            label={
                              poolOptions.length
                                ? 'choose a pool for uploads'
                                : 'Loading Available Pools...'
                            }
                            value={0}
                          />
                          {poolOptions.map((pool, index) => (
                            <Picker.Item
                              style={[{ width: '100%', height: 50 }]}
                              key={index}
                              label={
                                pool.name +
                                ' (' +
                                pool.participants.length +
                                ' members)'
                              }
                              value={pool.poolID}
                            />
                          ))}
                        </Picker>
                      )}
                    </View>
                  </ListItem>
                  <ListItem containerStyle={{ width: '100%'}}>
                    <ListItem.Content>
                      <ListItem.Subtitle>
                        <View style={styles.section}>
                          {fulaPeerId?.password && (
                            <Button
                              title="Clear pool selection"
                              onPress={clearPool}
                            />
                          )}
                        </View>
                      </ListItem.Subtitle>
                    </ListItem.Content>
                  </ListItem>
                </View>
              )}
            </>
          ) : (
            <View style={styles.section}>
              <Text>App needs notification permission to connect your wallet and perform data sync</Text>
              <Text>Tap allow in the prompt</Text>
              <View style={styles.space} />
              <Button
                loading={!provider}
                onPress={provider ? connectToWallet : undefined}
                title="Create DID"
              />
            </View>
          )}
          {did && false && (
            <View style={[{ width: '100%', display: 'none' }]}>
              <Card
                containerStyle={{
                  borderWidth: 0,
                }}
              >
                <Card.Title
                  style={{
                    textAlign: 'left',
                  }}
                >
                  SETTINGS
                </Card.Title>

                <ListItem
                  key="Bloxes"
                  bottomDivider
                  onPress={() =>
                    navigation.navigate(AppNavigationNames.BoxList)
                  }
                >
                  <Icon type="material-community" name="alpha-f-box-outline" />
                  <ListItem.Content>
                    <ListItem.Title lineBreakMode="tail">Bloxes</ListItem.Title>
                    <ListItem.Subtitle lineBreakMode="tail">
                      Add your blox address
                    </ListItem.Subtitle>
                  </ListItem.Content>
                </ListItem>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 30,
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  textCenter: {
    paddingVertical: 20,
    textAlign: 'center',
  },
  card: {
    flex: 1,
    padding: 10,
  },
  cardImage: {
    aspectRatio: 1,
    width: '100%',
    flex: 1,
    marginBottom: 8,
    borderRadius: 15,
  },
  avatarLarge: {
    backgroundColor: 'gray',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  headerIcon: {
    marginHorizontal: 5,
  },
  space: {
    marginTop: 20,
  },
})
