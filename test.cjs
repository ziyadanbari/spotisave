const axios = require("axios");

const options = {
  method: "GET",
  url: "https://youtube-mp37.p.rapidapi.com/get",
  params: { id: "d1KCyAdxPlw" },
  headers: {
    "X-RapidAPI-Key": "73cfd2a0ecmshbc5e01564a432abp1d656ajsn2878a3f3e2dc",
    "X-RapidAPI-Host": "youtube-mp37.p.rapidapi.com",
  },
};

try {
  const response = axios.request(options).then((res) => console.log(res.data));
} catch (error) {
  console.error(error);
}
