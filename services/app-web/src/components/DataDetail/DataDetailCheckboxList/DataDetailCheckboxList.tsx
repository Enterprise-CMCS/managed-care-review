import { DataDetailMissingField } from '../DataDetailMissingField'

export type DataDetailCheckboxListProps = {
    list: string[] // Checkbox field array
    dict: Record<string, string> // A lang constant dictionary like ManagedCareEntityRecord or FederalAuthorityRecord,
    otherReasons?: (string | null)[] // pass in additional "Other" user generated text to append to end of list,
    displayEmptyList?: boolean // what happens if list is empty - default to missing data error but surfacing this prop for cases like modified provisions where two lists are related
}

// Intended for use as children passed to DataDetail
// Display field values from checkbox components in forms.
export const DataDetailCheckboxList = ({
    list,
    dict,
    otherReasons = [],
    displayEmptyList = false,
}: DataDetailCheckboxListProps): React.ReactElement | null => {
    const userFriendlyList = list.map((item) => {
        return dict[item] ? dict[item] : null
    })

    const listToDisplay = otherReasons
        ? userFriendlyList.concat(otherReasons)
        : userFriendlyList

    if (listToDisplay.length === 0)
        return displayEmptyList ? null : <DataDetailMissingField />

    return (
        <ul>
            {listToDisplay.map((item) => (
                <li key={item} data-testid={item}>
                    {item}
                </li>
            ))}
        </ul>
    )
}
