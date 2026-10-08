export const isEditField = (isEditing) => ({
width: '100%',
  '& .MuiInputBase-root': {
    border: '1px solid',
    borderColor: 'grey.300',
    borderRadius: 1,
    padding: 5,
    bgcolor: isEditing ? 'grey.100' : 'common.white',
    color: isEditing ? 'grey.400' : 'common.black',
    transition: 'background-color 0.2s ease',
    ...(!isEditing && {
      '&:hover': {
        bgcolor: 'common.white',
      },
    }),
  },
});