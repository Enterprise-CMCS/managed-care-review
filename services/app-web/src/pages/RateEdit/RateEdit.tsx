import React from "react";

export const RateEdit = (): React.ReactElement => {
  return (
    <h1 data-testid="rate-edit">
      You've reached the ':id/edit' url placeholder for the incoming standalone edit rate form 
      <br/>
      Ticket: <a href="https://qmacbis.atlassian.net/browse/MCR-3771">MCR-3771</a>
    </h1>
  )
}