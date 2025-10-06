import { matchedData } from 'express-validator'
import httpStatus from 'http-status'
import SeoSettings from '../models/seo-settings.schema.js'
import buildResponse from '../utils/buildResponse.js'
import buildErrorObject from '../utils/buildErrorObject.js'
import handleError from '../utils/handleError.js'

// GET /api/v1/seo?path=/some/path
export const getSeoHeadController = async (req, res) => {
  try {
    const pathParam = (req.query.path || '/').toString().trim().toLowerCase()

    if (!pathParam) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(buildErrorObject(httpStatus.BAD_REQUEST, 'PATH_REQUIRED'))
    }

    const seo = await SeoSettings.findOne({ path: pathParam })
    const code = seo?.code || ''

    // Response includes raw HTML snippet intended to be injected into <head>
    return res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, { path: pathParam, code }),
    )
  } catch (error) {
    handleError(res, error)
  }
}

// POST /api/v1/seo  { path: '/some/path', code: '<meta ... />' }
export const setSeoHeadController = async (req, res) => {
  try {
    const body = req.body || {}
    const pathBody = (body.path || '/').toString().trim().toLowerCase()
    const codeBody = (body.code || '').toString()

    if (!pathBody) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .json(buildErrorObject(httpStatus.BAD_REQUEST, 'PATH_REQUIRED'))
    }

    const updated = await SeoSettings.findOneAndUpdate(
      { path: pathBody },
      { $set: { code: codeBody } },
      { new: true, upsert: true }
    )

    return res.status(httpStatus.OK).json(
      buildResponse(httpStatus.OK, { path: updated.path, code: updated.code }),
    )
  } catch (error) {
    // Handle duplicate key error cleanly
    if (error?.code === 11000) {
      return res
        .status(httpStatus.CONFLICT)
        .json(buildErrorObject(httpStatus.CONFLICT, 'DUPLICATE_PATH'))
    }
    handleError(res, error)
  }
}

