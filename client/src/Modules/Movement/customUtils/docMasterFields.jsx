export const docHeaderFields = {
    // Master fields
    DocNO: '',
    DocDate: '',
    Requestor: '',
    Department: '',
    Section: '',
    Remarks: '',
    Status: '',
}

export const docDetailFields = {
    // Detail fields
    ItemCode: '',
    ItemDescription: '',
    Quantity: 0,
    Unit: '',
    Remarks: '',
    Targetdate: '',
    SerialNo: '',
    Brand: '',
    Department: '',
    Location: '',
    WarrantyStart: '',
    WarrantyEnd: '',
    Status: 'OPEN',
}

export const prepareDocPayload = (joHeader, joDetails) => {
    return {
        // Prepare header data
        DocNO: joHeader.JO_NO,
        DocDate: joHeader.DocDate,
        Requestor: joHeader.Requestor,
        Department: joHeader.Department,
        Section: joHeader.Section,
        Remarks: joHeader.Remarks,
        Status: joHeader.Status,

        // Prepare details data
        Details: joDetails.map(detail => ({
            ItemCode: detail.ItemCode,
            ItemDescription: detail.ItemDescription,
            Quantity: detail.Quantity,
            Unit: detail.Unit,
            Remarks: detail.Remarks,
            Targetdate: detail.Targetdate,
            SerialNo: detail.SerialNo,
            Brand: detail.Brand,
            Department: detail.Department,
            Location: detail.Location,
            WarrantyStart: detail.WarrantyStart,
            WarrantyEnd: detail.WarrantyEnd,
            Status: detail.Status
        }))
    }
}   