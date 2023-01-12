import { DataDetailMissingField } from '../'

export type DataDetailCheckboxListProps = {
    list: string[] // Checkbox field array
    dict: Record<string, string> // A lang constant dictionary like ManagedCareEntityRecord or FederalAuthorityRecord,
    otherReasons?: (string | null)[] // pass in additional "Other" user generated text to append to end of list,
}
// Used to display field values from checkbox components in forms.
export const DataDetailCheckboxList = ({
    list,
    dict,
    otherReasons = [],
}: DataDetailCheckboxListProps): React.ReactElement | null => {
    const userFriendlyList = list.map((item) => {
        return dict[item] ? dict[item] : null
    })

    const listToDisplay = otherReasons
        ? userFriendlyList.concat(otherReasons)
        : userFriendlyList

    if (listToDisplay.length === 0) return <DataDetailMissingField />

    return (
        <ul>
            {listToDisplay.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    )
}
