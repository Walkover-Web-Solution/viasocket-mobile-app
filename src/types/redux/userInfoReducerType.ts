export interface User {
    name: string
    id: string
    email: string
    orgs: { id: string, name: string, company_id: string }[]
}

export interface $UserInfoReducerType extends User {
    currentOrgId: string
    proxyAuthToken: string
    currentOrgData: Record<string, unknown>
    currentPageId: string
    currentCollectionId: string
}