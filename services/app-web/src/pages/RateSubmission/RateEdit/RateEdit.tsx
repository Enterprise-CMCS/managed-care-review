import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFetchRateQuery } from "../../../gen/gqlClient";
import { GridContainer } from "@trussworks/react-uswds";
import { Loading } from "../../../components";
import { GenericErrorPage } from "../../Errors/GenericErrorPage";
import { RateDetailsV2 } from "../../StateSubmission/RateDetails/RateDetailsV2";

type RouteParams = {
  id: string
}

export const RateEdit = (): React.ReactElement => {
  const navigate = useNavigate()
  const { id } = useParams<keyof RouteParams>()
  if (!id) {
    throw new Error(
        'PROGRAMMING ERROR: id param not set in state submission form.'
    )
  }

  const { data, loading, error } = useFetchRateQuery({
    variables: {
        input: {
            rateID: id,
        },
    },
  })

  const rate = data?.fetchRate.rate

  if (loading) {
    return (
        <GridContainer>
            <Loading />
        </GridContainer>
    )
  } else if (error || !rate ) {
    return <GenericErrorPage />
  }

  if (rate.status !== 'UNLOCKED') {
    navigate(`/rates/${id}`)
  }

  return (
    <h1 data-testid="rate-edit">
     <RateDetailsV2 showValidations={true}/>
    </h1>
  )
}