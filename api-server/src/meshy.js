
import axios from 'axios';

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_API_URL = 'https://api.meshy.ai/v1';

const meshy = axios.create({
  baseURL: MESHY_API_URL,
  headers: {
    'Authorization': `Bearer ${MESHY_API_KEY}`,
  },
});

async function createTextTo3DTask(prompt) {
  const { data } = await meshy.post('/text-to-3d', {
    prompt,
    art_style: 'realistic',
    output_format: 'glb',
  });
  return data.result;
}

async function getTaskResult(taskId) {
  const { data } = await meshy.get(`/text-to-3d/${taskId}`);
  return data;
}

export default {
  createTextTo3DTask,
  getTaskResult,
};

export { createTextTo3DTask, getTaskResult };
