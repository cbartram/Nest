const {
  PHONE_NUMBER,
} = process.env;

const config = {
  urls: {
    OAUTH_URL: 'https://oauth2.googleapis.com/token',
    JWT_TOKEN_URL: 'https://nestauthproxyservice-pa.googleapis.com/v1/issue_jwt',
    NEXUS_HOST: 'https://nexusapi-us1.dropcam.com',
  },
  endpoints: {
    getEventsEndpoint: (id) => `/cuepoint/${id}/2`,
    getSnapshotEndpoint: (id) => `/event_snapshot/${id}/?crop_type=timeline&width=700`,
    getLatestImageEndpoint: (id) => `/get_image?width=640&uuid=${id}`,
  },
  // This field will be populated by the configuration object which is supplied
  // to the Nest() constructor
  secrets: {},
  aws: {
    s3: {
      bucket: 'BUCKET_NAME_HERE',
    },
    sns: {
      phoneNumber: PHONE_NUMBER,
    },
  },
};

module.exports = config;
