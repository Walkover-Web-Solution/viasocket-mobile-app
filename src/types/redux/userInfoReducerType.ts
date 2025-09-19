export interface User {
    name: string
    id: string
    email: string
    orgs: { id: string, name: string, company_id: string }[]
}

export interface Org {
    id: string;
    name: string;
    company_id: string;
}

export interface $UserInfoReducerType extends User {
    currentOrgId: string
    proxyAuthToken: string
    currentOrgData: Org | null
    currentPageId: string
    currentCollectionId: string
    chatbotToken: string
}