import { FC, FormEvent, useEffect, useState } from 'react';
import { Background } from './Background';
import './App.css';

const TESTNET_ADDRESS = '0xb35ec98ba0a1cf6b5c1d836a818d041a7cd9aa19';
const TESTNET_API_URL = 'https://testnets-api.opensea.io/api/v1';

export interface ISignInFormProps {
  onSignIn: (address: string) => void;
}

const SignInForm: FC<ISignInFormProps> = ({
  onSignIn
}) => {
  const [address, setAddress] = useState<string>(TESTNET_ADDRESS);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSignIn(address);
    return false;
  }

  return (
    <form onSubmit={onSubmit} className='sign-in'>
      <label>
        <span>Enter your Etherium address:</span>
        <input type='text' value={address} onChange={e => setAddress(e.target.value)}/>
      </label>
      <button role='submit' disabled={!address}>GO!</button>
    </form>
  );
};

async function getAssetsForAddress(address: string, retries: number = 3): Promise<IAsset[]> {
  if (retries < 0) {
    return [];
  }
  const qp = '?limit=50'; // `?owner=${address}`;
  const resp = await fetch(`${TESTNET_API_URL}/assets${qp}`);
  if (resp.status !== 200) {
    return await getAssetsForAddress(address, retries - 1);
  }
  const data = await resp.json();
  return data.assets;
}

interface IAsset {
  id: number;
  background_color?: string;
  image_url?: string;
  image_preview_url?: string;
  image_thumbnail_url?: string;
  image_original_url?: string;
  name?: string;
  description: string;
  external_link?: string;
  permalink: string;
  is_nsfw?: boolean;
  asset_contract: {
    asset_contract_type: string;
  }
}

interface IAssetsDisplayState {
  assets?: IAsset[];
  loaded?: boolean;
}

interface IAssetDisplayProps {
  asset: IAsset;
  onSelect: (asset: IAsset) => void;
}
const AssetDisplay: FC<IAssetDisplayProps> = ({ asset, onSelect }) => {
  const style: React.CSSProperties = {};
  if (!asset) {
    return null;
  }
  if (asset.background_color) {
    style.background = asset.background_color;
  }
  const imageUrl = asset.image_thumbnail_url ||
    asset.image_preview_url ||
    asset.image_url;

  const image = imageUrl
    ? <img src={imageUrl} className='asset-display-image'/>
    : null;

  return (
    <div className='asset' style={style} onClick={() => onSelect(asset)}>
      { image }
      <div className='asset-details'>
        <h3>{asset.name}</h3>
      </div>
    </div>
  );
};

interface IAssetsDisplayProps {
  address: string;
  onSelectAsset: (asset: IAsset) => void;
}
const AssetsDisplay: FC<IAssetsDisplayProps> = ({
  address,
  onSelectAsset
}) => {
  const [state, setState] = useState<IAssetsDisplayState>({});
  const {
    loaded,
    assets
  } = state;

  useEffect(() => {
    if (!loaded) {
      getAssetsForAddress(address)
        .then(assets => setState(s => ({ ...s, assets, loaded: true })));
    }
  }, []);

  if (!assets) {
    return <div className='loading'>loading...</div>;
  }

  const filteredAssets = assets.filter(asset => (
    asset.asset_contract.asset_contract_type === 'non-fungible' &&
    asset.name?.length &&
    !asset.is_nsfw
  ));

  return (
    <div className='assets'>
      {
        filteredAssets.map((asset, i) => <AssetDisplay asset={asset} key={i} onSelect={onSelectAsset}/>)
      }
    </div>
  );
};

interface IAssetDetailsDisplayProps {
  asset: IAsset;
  deselect: () => void;
}
const AssetDetailsDisplay: FC<IAssetDetailsDisplayProps> = ({
  asset,
  deselect
}) => {
  const imageUrl = asset.image_preview_url ||
    asset.image_url;

  const image = imageUrl
    ? <img src={imageUrl} className='asset-display-image'/>
    : null;

  return (
    <div className='asset-details-display'>
      <a href='#' onClick={deselect} className='back-link'>back</a>
      <div className='image-header'>
        { image }
      </div>
      <h2>{asset.name}</h2>
    </div>
  )
};

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<IAsset | null>(null);
  const [bgColor, setBgColor] = useState<[number, number, number]>([0.95, 0.95, 0.95]);

  function onSignIn(address: string) {
    setAddress(address);
    setBgColor([0.4, 0.6, 0.8]);
  }

  function onSelectAsset(asset: IAsset | null) {
    if (asset) {
      setBgColor([0.3, 0.45, 0.6]);
    }
    else {
      setBgColor([0.4, 0.6, 0.8]);
    }
    setSelectedAsset(asset);
  }

  let content: React.ReactElement;
  if (address) {
    if (selectedAsset) {
      content = <AssetDetailsDisplay asset={selectedAsset} deselect={() => onSelectAsset(null)}/>;
    } else {
      content = <AssetsDisplay address={address} onSelectAsset={onSelectAsset}/>;
    }
  } else {
    content = <SignInForm onSignIn={onSignIn} />;
  }

  return (
    <div className="app">
      <Background color={bgColor}/>
      { content }
    </div>
  );
}

export default App;
