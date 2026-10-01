import { DataDetailMissingField } from '../DataDetailMissingField'
import { ChangeTag, ChangeTagType } from '../../InfoTag'

export type DataDetailCheckboxListProps = {
    list: string[] // Checkbox field array
    dict: Record<string, string> // A lang constant dictionary like ManagedCareEntityRecord or FederalAuthorityRecord,
    otherReasons?: (string | null)[] // pass in additional "Other" user generated text to append to end of list,
    displayEmptyList?: boolean // what happens if list is empty - default to missing data error but surfacing this prop for cases like modified provisions where two lists are related
    itemTags?: Partial<Record<string, ChangeTagType>> // revision-history indicators keyed by the raw checkbox value
}

// Intended for use as children passed to DataDetail
// Display field values from checkbox components in forms.
export const DataDetailCheckboxList = ({
    list,
    dict,
    otherReasons = [],
    displayEmptyList = false,
    itemTags,
}: DataDetailCheckboxListProps): React.ReactElement | null => {
    const userFriendlyList = list.map((item) => {
        return dict[item] ? { label: dict[item], tag: itemTags?.[item] } : null
    })

    const listToDisplay = userFriendlyList.concat(
        otherReasons.map((reason) =>
            reason ? { label: reason, tag: undefined } : null
        )
    )

    if (listToDisplay.length === 0) {
        return displayEmptyList ? (
            <span className={'usa-hint'}>—</span> //em dash
        ) : (
            <DataDetailMissingField />
        )
    }

    return (
        <ul>
            {listToDisplay.map((item) => (
                <li key={item?.label} data-testid={item?.label}>
                    {item?.tag && (
                        <>
                            <ChangeTag tag={item.tag} />{' '}
                        </>
                    )}
                    {item?.label}
                </li>
            ))}
        </ul>
    )
}
