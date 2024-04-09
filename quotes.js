const axios = require('axios')

async function fetchQuotes(apiUrl) {
  try {
    const response = await axios.get(apiUrl)
    return response.data[0];
  } catch (error) {
    console.error('Error fetching quotes:', error.message);
    throw error
  }
}

// API URL
const apiUrl = 'https://zenquotes.io/api/quotes/'

// Fetch quotes
fetchQuotes(apiUrl)
  .then(quotes => {
    console.log('Quotes:', quotes)
    //do something with quotes
  })
  .catch(error => {
    console.log('Failed to fetch quotes:', error.message)
  });