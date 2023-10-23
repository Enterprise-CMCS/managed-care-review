import * as Yup from 'yup'

export const MccrsIdFormSchema = () => {

    return Yup.object().shape({
        mccrsId: Yup.number().required(
            'You must enter a record number or delete this field.'
        )
        .typeError('You must enter a number')
        .test('len', 'You must enter no more than 4 characters', val => val?.toString().length === 4)
        ,
    })
}
