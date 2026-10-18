import { useState, useCallback, useEffect } from 'react'
import { Select, MenuItem, Snackbar, Alert, Button } from '@mui/material'
import AAFormPage from '../pages/assetAccPage';
import ReturnSlipPage from '../pages/returnItemPage';
import { useSearchParams } from 'react-router-dom'

const FORM_TYPES = ['Asset Accountability', 'Return Slip']

export default function AAFormType(){
  const [searchParams] = useSearchParams()
  // Preselect from ?formType=..., ignoring anything that isn't a known type
  const [formType, setFormType] = useState(() => {
  const fromUrl = searchParams.get('formType')
      return FORM_TYPES.includes(fromUrl) ? fromUrl : 'Asset Accountability'
    })
  const [pendingType, setPendingType] = useState(null)   // type the user wants to switch to
  const [hasUnsaved, setHasUnsaved] = useState(false)    // reported by AAFormPage
  const [formKey, setFormKey] = useState(0)              // remount the form to discard its state

  const handleDirtyChange = useCallback((dirty) => setHasUnsaved(dirty), [])

  const applyType = (type) => {
    setFormType(type)
    setHasUnsaved(false)
    setFormKey(k => k + 1)
  }

  const handleTypeChange = (e) => {
    const next = e.target.value
    if (next === formType) return

    // Unsaved changes: ask first through the toast instead of switching right away
    if (hasUnsaved) {
      setPendingType(next)
      return
    }
    applyType(next)
  }

  const confirmDiscard = () => {
    applyType(pendingType)
    setPendingType(null)
  }

  const keepEditing = () => setPendingType(null)

  return (
    <>
      <div className='flex gap-10 pl-20 mt-10 place-items-center'>
        <label className='text-sm font-medium tracking-wide text'>
          Form Type
        </label>
        <Select
          displayEmpty
          value={formType}
          onChange={handleTypeChange}
          renderValue={(selected) =>
            !selected ? <span  style={{ color: '#666', padding: 'none' }}>Select Type</span> : selected
          }
          sx={{ 
            minWidth: 300, 
            fontSize: '1rem',
            '& .MuiSelect-select': {
              paddingTop: '8px',
              paddingBottom: '8px',
            }
          }}
        >
          <MenuItem value="Asset Accountability">Asset Accountability</MenuItem>
          <MenuItem value="Return Slip">Return Slip</MenuItem>
        </Select>
      </div>

      {/* Form sits right under the type selector */}
      {formType === 'Asset Accountability' && (
        <AAFormPage key={formKey} onDirtyChange={handleDirtyChange} />
      )}
      
      {/* Form sits right under the type selector */}
      {formType === 'Return Slip' && (
        <ReturnSlipPage key={formKey} onDirtyChange={handleDirtyChange} />
      )}

      {/* Unsaved-changes toast */}
      <Snackbar
        open={pendingType !== null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={(event, reason) => {
          if (reason === 'clickaway') return
          keepEditing()
        }}
      >
        <Alert
          severity='warning'
          variant='filled'
          action={
            <>
              <Button color='inherit' size='small' onClick={keepEditing}>
                Keep Editing
              </Button>
              <Button color='inherit' size='small' onClick={confirmDiscard}>
                Discard
              </Button>
            </>
          }
        >
          Unsaved changes will be disregarded if you change the transfer type.
        </Alert>
      </Snackbar>
    </>
  )
}