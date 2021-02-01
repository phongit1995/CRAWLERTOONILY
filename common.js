function isCloudflareJSChallenge(body) {
    return body.includes('cf-browser-verification');
    }
    module.exports={
    isCloudflareJSChallenge
    }