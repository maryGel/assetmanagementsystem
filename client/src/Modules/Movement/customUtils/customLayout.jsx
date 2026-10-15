export const tableFieldFormat = (isEditing, isCreating) => {

    return {
        fontSize: '0.875rem',
        padding: 1,
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 1,
        color: !isEditing && !isCreating ? 'grey.600' : 'black'
    }
}
