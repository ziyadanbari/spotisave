import axios from "axios";
import { stringify } from "qs";
console.log(
  stringify({
    grant_type: "client_credentials",
    client_id: "e77fa00b3d2440e89d66fc7f40369cf5",
    client_secret: "f27ea124f4254cbfa71e1adef21cd051",
  })
);
const response = await axios.post(
  "https://accounts.spotify.com/api/token",
  stringify({
    grant_type: "client_credentials",
    client_id: "e77fa00b3d2440e89d66fc7f40369cf5",
    client_secret: "f27ea124f4254cbfa71e1adef21cd051",
  }),
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }
);
// console.log(response);
