export const titleCaseString = (str: string): string => {
    return str.replace(
        /\w\S*/g,
        word => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
    );
}
