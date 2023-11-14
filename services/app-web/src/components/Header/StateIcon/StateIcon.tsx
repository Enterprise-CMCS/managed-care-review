import { ReactComponent as FlIcon } from '../../../assets/icons/fl-icon.svg'
import { ReactComponent as InIcon } from '../../../assets/icons/in-icon.svg'
import { ReactComponent as MsIcon } from '../../../assets/icons/ms-icon.svg'
import { ReactComponent as VaIcon } from '../../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../../assets/icons/mn-icon.svg'
import { ReactComponent as AsIcon } from '../../../assets/icons/as-icon.svg'
import { ReactComponent as AkIcon } from '../../../assets/icons/ak-icon.svg'
import { ReactComponent as AlIcon } from '../../../assets/icons/al-icon.svg'
import { ReactComponent as ArIcon } from '../../../assets/icons/ar-icon.svg'
import { ReactComponent as AzIcon } from '../../../assets/icons/az-icon.svg'
import { ReactComponent as CaIcon } from '../../../assets/icons/ca-icon.svg'
import { ReactComponent as CoIcon } from '../../../assets/icons/co-icon.svg'
import { ReactComponent as CtIcon } from '../../../assets/icons/ct-icon.svg'
import { ReactComponent as DcIcon } from '../../../assets/icons/dc-icon.svg'
import { ReactComponent as DeIcon } from '../../../assets/icons/de-icon.svg'
import { ReactComponent as GaIcon } from '../../../assets/icons/ga-icon.svg'
import { ReactComponent as HiIcon } from '../../../assets/icons/hi-icon.svg'
import { ReactComponent as IaIcon } from '../../../assets/icons/ia-icon.svg'
import { ReactComponent as IdIcon } from '../../../assets/icons/id-icon.svg'
import { ReactComponent as IlIcon } from '../../../assets/icons/il-icon.svg'
import { ReactComponent as KsIcon } from '../../../assets/icons/ks-icon.svg'
import { ReactComponent as KyIcon } from '../../../assets/icons/ky-icon.svg'
import { ReactComponent as LaIcon } from '../../../assets/icons/la-icon.svg'
import { ReactComponent as MaIcon } from '../../../assets/icons/ma-icon.svg'
import { ReactComponent as MdIcon } from '../../../assets/icons/md-icon.svg'
import { ReactComponent as MeIcon } from '../../../assets/icons/me-icon.svg'
import { ReactComponent as MiIcon } from '../../../assets/icons/mi-icon.svg'
import { ReactComponent as MoIcon } from '../../../assets/icons/mo-icon.svg'
import { ReactComponent as MtIcon } from '../../../assets/icons/mt-icon.svg'
import { ReactComponent as NcIcon } from '../../../assets/icons/nc-icon.svg'
import { ReactComponent as NdIcon } from '../../../assets/icons/nd-icon.svg'
import { ReactComponent as NeIcon } from '../../../assets/icons/ne-icon.svg'
import { ReactComponent as NhIcon } from '../../../assets/icons/nh-icon.svg'
import { ReactComponent as NjIcon } from '../../../assets/icons/nj-icon.svg'
import { ReactComponent as NmIcon } from '../../../assets/icons/nm-icon.svg'
import { ReactComponent as NvIcon } from '../../../assets/icons/nv-icon.svg'
import { ReactComponent as NyIcon } from '../../../assets/icons/ny-icon.svg'
import { ReactComponent as OhIcon } from '../../../assets/icons/oh-icon.svg'
import { ReactComponent as OkIcon } from '../../../assets/icons/ok-icon.svg'
import { ReactComponent as OrIcon } from '../../../assets/icons/or-icon.svg'
import { ReactComponent as PaIcon } from '../../../assets/icons/pa-icon.svg'
import { ReactComponent as PrIcon } from '../../../assets/icons/pr-icon.svg'
import { ReactComponent as RiIcon } from '../../../assets/icons/ri-icon.svg'
import { ReactComponent as ScIcon } from '../../../assets/icons/sc-icon.svg'
import { ReactComponent as SdIcon } from '../../../assets/icons/sd-icon.svg'
import { ReactComponent as TnIcon } from '../../../assets/icons/tn-icon.svg'
import { ReactComponent as TxIcon } from '../../../assets/icons/tx-icon.svg'
import { ReactComponent as UtIcon } from '../../../assets/icons/ut-icon.svg'
import { ReactComponent as VtIcon } from '../../../assets/icons/vt-icon.svg'
import { ReactComponent as WaIcon } from '../../../assets/icons/wa-icon.svg'
import { ReactComponent as WiIcon } from '../../../assets/icons/wi-icon.svg'
import { ReactComponent as WvIcon } from '../../../assets/icons/wv-icon.svg'
import { ReactComponent as WyIcon } from '../../../assets/icons/wy-icon.svg'
import { StateCodeType } from '../../../common-code/healthPlanFormDataType'

export type StateIconProps = {
    code: StateCodeType
}
export const StateIcon = ({ code }: StateIconProps): React.ReactElement => {
    switch (code) {
        case 'FL':
            return <FlIcon />
        case 'IN':
            return <InIcon />
        case 'MN':
            return <MnIcon />
        case 'MS':
            return <MsIcon />
        case 'VA':
            return <VaIcon />
        case 'AS':
            return <AsIcon />
        case 'AK':
            return <AkIcon />
        case 'AL':
            return <AlIcon />
        case 'AR':
            return <ArIcon />
        case 'AZ':
            return <AzIcon />
        case 'CA':
            return <CaIcon />
        case 'CO':
            return <CoIcon />
        case 'CT':
            return <CtIcon />
        case 'DC':
            return <DcIcon />
        case 'DE':
            return <DeIcon />
        case 'GA':
            return <GaIcon />
        case 'HI':
            return <HiIcon />
        case 'IA':
            return <IaIcon />
        case 'ID':
            return <IdIcon />
        case 'IL':
            return <IlIcon />
        case 'KS':
            return <KsIcon />
        case 'KY':
            return <KyIcon />
        case 'LA':
            return <LaIcon />
        case 'MA':
            return <MaIcon />
        case 'MD':
            return <MdIcon />
        case 'ME':
            return <MeIcon />
        case 'MI':
            return <MiIcon />
        case 'MO':
            return <MoIcon />
        case 'MT':
            return <MtIcon />
        case 'NC':
            return <NcIcon />
        case 'ND':
            return <NdIcon />
        case 'NE':
            return <NeIcon />
        case 'NH':
            return <NhIcon />
        case 'NJ':
            return <NjIcon />
        case 'NM':
            return <NmIcon />
        case 'NV':
            return <NvIcon />
        case 'NY':
            return <NyIcon />
        case 'OH':
            return <OhIcon />
        case 'OK':
            return <OkIcon />
        case 'OR':
            return <OrIcon />
        case 'PA':
            return <PaIcon />
        case 'PR':
            return <PrIcon />
        case 'RI':
            return <RiIcon />
        case 'SC':
            return <ScIcon />
        case 'SD':
            return <SdIcon />
        case 'TN':
            return <TnIcon />
        case 'TX':
            return <TxIcon />
        case 'UT':
            return <UtIcon />
        case 'VT':
            return <VtIcon />
        case 'WA':
            return <WaIcon />
        case 'WI':
            return <WiIcon />
        case 'WV':
            return <WvIcon />
        case 'WY':
            return <WyIcon />
        default:
            return <span>STATE UNKNOWN</span>
    }
}
