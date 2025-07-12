import apiClient from ".";

class OrgApis {
    static async asgetOrgDetailsByOrgId(orgId: string) {
        return apiClient.get(`/getCompanies?id=${orgId}`);
    }
    static async getUserOrgs(itemsPerPage = '1000') {
        const response = await apiClient.get(`/c/getCompanies?itemsPerPage=${itemsPerPage}`);
        const orgs = response?.data?.data?.data || [];
        return orgs;
    }
}
export default OrgApis