import * as Yup from 'yup'

export const MccrsIdFormSchema = () => {
    return Yup.object().shape({
        mccrsId: Yup.number().typeError('You must enter a number'),
    })
}
