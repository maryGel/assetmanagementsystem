import { useState, useCallback, useEffect } from 'react'
import { Select, MenuItem, Snackbar, Alert, Button } from '@mui/material'
import TRFormPage from '../pages/transferFormPage'
import { useSearchParams } from 'react-router-dom'

const TRANSFER_TYPES = ['Transfer Internal', 'Stock Transfer In', 'Stock Transfer Out']

export default function TRFormType(){
  const [searchParams] = useSearchParams()
  // Preselect from ?transferType=..., ignoring anything that isn't a known type
  const [transferType, setTransferType] = useState(() => {
  const fromUrl = searchParams.get('transferType')
      return TRANSFER_TYPES.includes(fromUrl) ? fromUrl : ''
    })
  const [pendingType, setPendingType] = useState(null)   // type the user wants to switch to
  const [hasUnsaved, setHasUnsaved] = useState(false)    // reported by TRFormPage
  const [formKey, setFormKey] = useState(0)              // remount the form to discard its state

  const handleDirtyChange = useCallback((dirty) => setHasUnsaved(dirty), [])

  const applyType = (type) => {
    setTransferType(type)
    setHasUnsaved(false)
    setFormKey(k => k + 1)
  }

  const handleTypeChange = (e) => {
    const next = e.target.value
    if (next === transferType) return

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
        <label className='text-lg font-medium tracking-wider'>
          Transfer Type
        </label>
        <Select
          displayEmpty
          value={transferType}
          onChange={handleTypeChange}
          renderValue={(selected) =>
            !selected ? <span  style={{ color: '#666', padding: 'none' }}>Select Type</span> : selected
          }
          sx={{ 
            minWidth: 300, 
            fontSize: '1.125rem',
            '& .MuiSelect-select': {
              paddingTop: '8px',
              paddingBottom: '8px',
            }
          }}
        >
          <MenuItem value="Transfer Internal">Transfer Internal</MenuItem>
          <MenuItem value="Stock Transfer In">Stock Transfer In</MenuItem>
          <MenuItem value="Stock Transfer Out">Stock Transfer Out</MenuItem>
        </Select>
      </div>

      {/* Form sits right under the type selector */}
      {transferType === 'Transfer Internal' && (
        <TRFormPage key={formKey} onDirtyChange={handleDirtyChange} />
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