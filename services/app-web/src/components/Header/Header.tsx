import { Header as ReactUSWDSHeader, Title } from "@trussworks/react-uswds";

export const CMSHeader = () => {
  return (
    <ReactUSWDSHeader basic>
      <div className="usa-nav-container">
        <div className="usa-navbar">
          <Title>State Submission Project</Title>
        </div>
      </div>
    </ReactUSWDSHeader>
  );
};
