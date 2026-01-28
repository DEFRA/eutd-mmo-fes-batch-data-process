export const AuditEventTypes = Object.freeze( 
    {
        Investigated: 'INVESTIGATED',
        Voided: 'VOIDED',
        PreApproved: 'PREAPPROVED'
    }
)

export const InvestigationStatus = Object.freeze(
    {
        DataError: 'DATA_ERROR_NFA',
        MinorVerbal:'MINOR_VERBAL',
        MinorWritten: 'MINOR_WRITTEN',
        UnderInvestigation: 'UNDER_INVESTIGATION',
        Open: 'OPEN_UNDER_ENQUIRY',
        Closed: 'CLOSED_NFA',
        UserEducationProvided: 'USER_EDUCATION_PROVIDED'
    }
)

export interface IAuditEvent {
    eventType: string,
    triggeredBy: string,
    timestamp: Date,
    data: any
}
