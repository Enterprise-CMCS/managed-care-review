import * as Yup from 'yup'

export const MccrsIdFormSchema = () => {
    return Yup.object().shape({
        mccrsId: Yup.number()
            .required('You must enter a record number or delete this field.')
            .typeError('You must enter a number'),
    })
}
