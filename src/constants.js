const {
    NEST_ID,
    REFRESH_TOKEN,
    CLIENT_ID,
    API_KEY,
    PHONE_NUMBER
} = process.env;

const config = {
    urls: {
        OAUTH_URL: 'https://oauth2.googleapis.com/token',
        JWT_TOKEN_URL: 'https://nestauthproxyservice-pa.googleapis.com/v1/issue_jwt',
        NEXUS_HOST: 'https://nexusapi-us1.dropcam.com'
    },
    endpoints: {
        EVENTS_ENDPOINT: `/cuepoint/${NEST_ID}/2`,
        SNAPSHOT_ENDPOINT: `/event_snapshot/${NEST_ID}/?crop_type=timeline&width=700`,
        LATEST_IMAGE_ENDPOINT: `/get_image?width=640&uuid=${NEST_ID}`
    },
    secret: {
        refreshToken: REFRESH_TOKEN,
        clientId: CLIENT_ID,
        apiKey: API_KEY,
    },
    aws: {
        s3: {
            bucket: 'BUCKET_NAME_HERE'
        },
        sns: {
            phoneNumber: PHONE_NUMBER
        }
    },
};

module.exports = {
    config,
    PORT: process.env.PORT || 3000
};
