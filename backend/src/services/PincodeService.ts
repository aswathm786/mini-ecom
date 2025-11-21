/**
 * Pincode Service
 * 
 * Fetches city and state information from pincode using India Post API or similar service.
 */

interface PincodeData {
  pincode: string;
  city: string;
  state: string;
  district?: string;
}

class PincodeService {
  /**
   * Fetch city and state from pincode
   * Uses a free API service for Indian pincodes
   */
  async getPincodeData(pincode: string): Promise<PincodeData | null> {
    try {
      // Validate pincode format (6 digits for India)
      if (!/^\d{6}$/.test(pincode)) {
        return null;
      }

      // Try multiple API endpoints for reliability
      const apis = [
        `https://api.postalpincode.in/pincode/${pincode}`,
        `https://pincode.saratchandra.in/api/pincode/${pincode}`,
      ];

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            continue;
          }

          const data = await response.json();

          // Handle postalpincode.in API format
          if (data[0] && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            return {
              pincode,
              city: postOffice.District || postOffice.Name || '',
              state: postOffice.State || '',
              district: postOffice.District || '',
            };
          }

          // Handle saratchandra.in API format
          if (data.city && data.state) {
            return {
              pincode,
              city: data.city,
              state: data.state,
              district: data.district,
            };
          }
        } catch (error) {
          // Try next API
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching pincode data:', error);
      return null;
    }
  }
}

export const pincodeService = new PincodeService();

