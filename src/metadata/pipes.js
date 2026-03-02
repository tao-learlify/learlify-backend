import { Validator } from 'validation'

export const emailConfig = {
  email: Validator.accessLibrary.string().required()
}

export const passwordConfig = {
  password: Validator.accessLibrary.string().min(8).max(24).required()
}

export const nameConfig = {
  firstName: Validator.accessLibrary.string().min(2).max(30).required(),
  lastName: Validator.accessLibrary.string().min(2).max(30).required()
}
