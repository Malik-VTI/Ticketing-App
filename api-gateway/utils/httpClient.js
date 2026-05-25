const axios = require('axios');

/**
 * Create HTTP client for service communication
 */
const createServiceClient = (baseUrl, timeout = 5000) => {
  return axios.create({
    baseURL: baseUrl,
    timeout: timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Proxy request to microservice
 */
const proxyRequest = async (client, method, path, options = {}) => {
  try {
    const { data, headers, params, authHeader } = options;
    
    const config = {
      method: method.toLowerCase(),
      url: path,
      headers: {
        ...headers,
        // Forward Authorization header if provided
        ...(authHeader && { 'Authorization': authHeader }),
        // Forward user info if available (for fallback)
        ...(options.userId && { 'X-User-Id': options.userId }),
        ...(options.userEmail && { 'X-User-Email': options.userEmail }),
      },
    };

    if (data) {
      config.data = data;
    }

    if (params) {
      config.params = params;
    }

    const response = await client.request(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      // Service responded with error
      throw {
        status: error.response.status,
        data: error.response.data,
        message: error.response.data?.message || error.message,
      };
    } else if (error.request) {
      // Request made but no response
      throw {
        status: 503,
        message: 'Service unavailable',
        data: { error: 'service_unavailable' },
      };
    } else {
      // Error setting up request
      throw {
        status: 500,
        message: error.message,
        data: { error: 'internal_error' },
      };
    }
  }
};

/**
 * Aggregate multiple service requests
 */
const aggregateRequests = async (requests) => {
  try {
    const results = await Promise.allSettled(requests);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          success: true,
          data: result.value,
        };
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Request failed',
          status: result.reason?.status || 500,
        };
      }
    });
  } catch (error) {
    throw {
      status: 500,
      message: 'Failed to aggregate requests',
      data: { error: 'aggregation_error' },
    };
  }
};

module.exports = {
  createServiceClient,
  proxyRequest,
  aggregateRequests,
};

