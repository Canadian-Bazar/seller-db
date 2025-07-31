import jwt from 'jsonwebtoken'

import encrypt from './encrypt.js'

const generateAuthToken = (user = {}) => {
  return encrypt(
    jwt.sign(user, process.env.AUTH_SECRET, {
      expiresIn: process.env.AUTH_EXPIRATION,
    }),
  )
}

const generateRefreshToken = (user = {}) => {
  return encrypt(
    jwt.sign(user, process.env.REFRESH_SECRET, {
      expiresIn: process.env.REFRESH_EXPIRATION,
    }),
  )
}

const generateTokens = (user = {}) => {
  const sellerAccessToken = generateAuthToken(user)
  const sellerRefreshToken = generateRefreshToken(user)

  return { sellerAccessToken, sellerRefreshToken }
}

export default generateTokens
