import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

import card from './schemas/card.model';

dotenv.config();
const { DATABASE_URL } = process.env;

const connect = async () => {
  const conn = await mongoose
    .connect(DATABASE_URL as string)
    .catch((err) => console.log(err));
  console.log('Mongoose Connection Established');

  const Cards = mongoose.model('cards', card);

  return { conn, Cards };
};

export default connect;
