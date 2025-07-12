import apiClient from ".";

class UserApis {
    static async getUser(userId: string) {
        let respones = await apiClient.get(`/getDetails?user_id=${userId}`)
        return respones.data
    }
    static async getAllUsersOfOrg(orgId: string) {
        let allUsers: Object[] = [];
        let currentPage = 1;
        const itemsPerPage = 1000;

        try {
            let totalPageCount = 0;

            do {
                const response = await apiClient.get(`/getDetails?company_id=${orgId}&itemsPerPage=${itemsPerPage}&pageNo=${currentPage}`);
                const data = response?.data?.data?.data || [];
                totalPageCount = response?.data?.data?.totalPageCount;

                allUsers = [...allUsers, ...data];

                currentPage++;
            } while (currentPage <= totalPageCount);

            return { data: allUsers };
        } catch (error: any) {
            console.error('Error fetching data:', error.message);
            throw error; // Rethrow the error after logging
        }
    }
}

export default UserApis