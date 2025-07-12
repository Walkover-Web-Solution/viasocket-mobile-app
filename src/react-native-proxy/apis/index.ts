import axios from 'axios';

const PROXY_BASE_URL = 'https://routes.msg91.com/api/870623m1696579096651fbe18d4458';

const apiClient = axios.create({
  baseURL: PROXY_BASE_URL
});

apiClient.interceptors.request.use(
  function (config) {
    console.log('Request sent at:', new Date().toISOString());
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  function (response) {
    console.log('Response received at:', new Date().toISOString());
    return response;
  },
  function (error) {
    return Promise.reject(error);
  }
);

export default apiClient;
