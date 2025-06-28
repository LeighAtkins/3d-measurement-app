
import AWS from 'aws-sdk';
import multer from 'multer';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3 = new AWS.S3({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

const upload = multer({
  storage: multer.memoryStorage(),
});

async function uploadFile(file) {
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: `${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  await s3.upload(params).promise();
  return params.Key;
}

async function getSignedUrl(key) {
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Expires: 3600,
  };
  return s3.getSignedUrlPromise('getObject', params);
}

export default {
  upload,
  uploadFile,
  getSignedUrl,
};

export { upload, uploadFile, getSignedUrl };
