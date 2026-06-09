import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CloseIcon from '@mui/icons-material/Close';

const btnStyles = "flex justify-center pt-1 pb-1 pl-2 pr-3 transition-transform duration-200 ease-in-out border rounded-full shadow-black border-spacing-1 active:scale-95"; 

const variantStyles = {
  saveBtn : 'text-white bg-green-500 hover:bg-green-700',
  editBtn: 'text-white border-slate-300 bg-blue-800 text-white hover:bg-blue-600',
  cancelBtn: 'text-white bg-gray-600  hover:bg-gray-400 hover:text-white',
  createBtn: 'text-gray-600 bg-slate-200 shadow-black hover:text-gray-800',
  postBtn: 'text-green-700 bg-slate-200 shadow-black hover:text-green-600 hover:bg-slate-200',
  approveBtn: 'text-green-700 bg-slate-200 shadow-black hover:text-green-600 hover:bg-slate-200',
  printBtn: 'text-gray-700 bg-slate-200 hover:text-gray-500',
  deleteBtn: 'text-red-800 bg-slate-100 hover:text-red-700 hover:bg-slate-200',
  goBtn: 'text-white bg-green-500 shadow-black hover:text-gray-600',
  clearBtn: 'text-gray-600 hover:bg-gray-600 border-slate-300 hover:text-white',
  rejectBtn: 'text-red-800 bg-slate-100 hover:text-red-700 hover:bg-slate-200'
}

const icons = {
  edit: EditIcon,
  save: SaveIcon,
  cancel: CancelIcon,
  post: AssignmentTurnedInIcon,
  approve: AssignmentTurnedInIcon,
  add: AddIcon,
  print: PrintIcon,
  delete: DeleteIcon,
  go: CheckCircleIcon,
  clear: ClearAllIcon,
  reject: CloseIcon
}


export const CustomBtn = ({
  children,
  onClick,
  variant="",
  disabled=false,
  type = 'button',
  className = '',
  iconType = '',
  title =''
}) => {

  const classes = `${btnStyles} ${variantStyles[variant]} ${className} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  
  const Icon = icons[iconType];

    return (
      <>
        <button
          className = {classes}
          onClick = {onClick}
          disabled={disabled}
          type= {type}
          title = {title}
        >
          {Icon && <Icon/>}
          <span>{children}</span>
        </button>
      </>
    )
}


export const getButtonConfig = (state, baseHeader, canApprove) => {
  // If creating new document
  if (state.isCreating) {
    return { showPost: false, showApprove: false, showReject: false };
  }
  
  // If editing draft
  if (state.isEditing && baseHeader?.xpost === 0) {
    return { showPost: true, showApprove: false, showReject: false, postText: 'Post' };
  }
  
  // For existing documents
  if (baseHeader) {
    // Draft - not posted yet
    if (baseHeader.xpost === 0) {
      return { showPost: true, showApprove: false, showReject: false, postText: 'Post' };
    }
    
    // For approval status
    if (baseHeader.xpost === 3) {
      const approvalCheck = canApprove({ xpost: baseHeader.xpost, disapproved: baseHeader.disapproved });
      return { 
        showPost: false, 
        showApprove: approvalCheck.canApprove, 
        showReject: true,
        approveText: 'Approve',
        rejectText: 'Reject'
      };
    }
    
    // Fully approved
    if (baseHeader.xpost === 1) {
      return { showPost: false, showApprove: false, showReject: false };
    }
    
    // Rejected
    if (baseHeader.xpost === 4) {
      return { showPost: false, showApprove: false, showReject: false };
    }
  }
  
  return { showPost: false, showApprove: false, showReject: false };
};