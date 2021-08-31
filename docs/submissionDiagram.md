# Submission Data Model

This diagram is drawn using [Mermaid](https://mermaid-js.github.io/mermaid/#/entityRelationshipDiagram) to better visualize how data could be stored in the database if tables were used. We handle submission data as a blob. Thus, domain models for parts of a submission that are contained to the api (such as contract/rate amendment info) are not included.

You can edit and save new diagrams using the [Mermaid Live Editor](https://mermaid-js.github.io/mermaid-live-editor).

[![Mermaid diagram][1]][1]

[1]: https://mermaid.ink/img/eyJjb2RlIjoiZXJEaWFncmFtXG5TVEFURSB7XG4gICAgc3RyaW5nIGNvZGVcbiAgICBzdHJpbmcgbmFtZVxufVNUQVRFfHwtLXx7IFBST0dSQU0gOiBoYXNcblxuUFJPR1JBTSB8fC0tfHsgU1VCTUlTU0lPTiA6IGhhc1xuICAgIFBST0dSQU0ge1xuICAgICAgICBzdHJpbmcgaWRcbiAgICAgICAgc3RyaW5nIG5hbWVcbiAgICAgICAgZW51bSBzdGF0ZUNvZGVcbiAgICB9XG5cblNVQk1JU1NJT04ge1xuICAgIHN0cmluZyBpZFxuICAgIHN0cmluZyBzdGF0dXNcbiAgICBudW1iZXIgc3RhdGVOdW1iZXJcbiAgICBlbnVtIHN0YXRlQ29kZVxuICAgIHN0cmluZyBzdWJtaXNzaW9uRGVzY3JpcHRpb25cbiAgICBlbnVtIHN1Ym1pc3Npb25UeXBlXG4gICAgc3RyaW5nIHByb2dyYW1JRFxuICAgIGVudW0gY29udHJhY3RUeXBlXG4gICAgZGF0ZSBjb250cmFjdERhdGVTdGFydFxuICAgIGRhdGUgY29udHJhY3REYXRlRW5kXG4gICAgYXJyYXkgbWFuYWdlZENhcmVFbnRpdGllc1xuICAgIGFycmF5IGZlZGVyYWxBdXRob3JpdGllc1xuICAgIGVudW0gcmF0ZVR5cGVcbiAgICBkYXRlIHJhdGVEYXRlU3RhcnRcbiAgICBkYXRlIHJhdGVEYXRlRW5kXG4gICAgZGF0ZSByYXRlRGF0ZUNlcnRpZmllZFxuICAgIGRhdGUgc3VibWl0dGVkQXRcbiAgICBkYXRlIGNyZWF0ZWRBdFxuICAgIGRhdGUgdXBkYXRlZEF0XG4gICAgb2JqZWN0IHJhdGVBbWVuZG1lbnRJbmZvXG4gICAgb2JqZWN0IGNvbnRyYWN0QW1lbmRtZW50SW5mb1xuICAgIGFycmF5IHN0YXRlQ29udGFjdHNcbn1cbiBcblNVQk1JU1NJT04gfHwtLXx7IERPQ1VNRU5UIDogY29udGFpbnNcbiAgICBET0NVTUVOVCB7XG4gICAgICAgIHN0cmluZyBuYW1lXG4gICAgICAgIHN0cmluZyBTM1VSTFxuICAgIH1cbiIsIm1lcm1haWQiOnsidGhlbWUiOiJkZWZhdWx0In0sInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0

**Source Code:**
This can be used to regenerate the diagram as needed. Please keep up to date in case live editor links stop working well.

```none
erDiagram
STATE {
    string code
    string name
}STATE||--|{ PROGRAM : has

PROGRAM ||--|{ SUBMISSION : has
    PROGRAM {
        string id
        string name
        enum stateCode
    }

SUBMISSION {
    string id
    string status
    number stateNumber
    enum stateCode
    string submissionDescription
    enum submissionType
    string programID
    enum contractType
    date contractDateStart
    date contractDateEnd
    array managedCareEntities
    array federalAuthorities
    enum rateType
    date rateDateStart
    date rateDateEnd
    date rateDateCertified
    date submittedAt
    date createdAt
    date updatedAt
    object rateAmendmentInfo
    object contractAmendmentInfo
    array stateContacts
}

SUBMISSION ||--|{ DOCUMENT : contains
    DOCUMENT {
        string name
        string S3URL
    }
```

## Future Diagram

This version of the diagram imagines a future where rate certs are broken out separate from contracts and was used as part of the postgres slide deck

[![Future Mermaid Diagram][2]][2]

[2]: https://mermaid-js.github.io/mermaid-live-editor/edit/##eyJjb2RlIjoiZXJEaWFncmFtXG5TVEFURSB7XG4gICAgc3RyaW5nIGNvZGVcbiAgICBzdHJpbmcgbmFtZVxufVNUQVRFfHwtLXx7IFBST0dSQU0gOiBoYXNcblxuUFJPR1JBTSB9fC0tfHsgQ09OVFJBQ1RfUkVWSUVXIDogXCJtYW55IHRvIG1hbnlcIlxuICAgIFxuUFJPR1JBTSB7XG4gICAgc3RyaW5nIGlkXG4gICAgZW51bSBzdGF0ZUNvZGVcbiAgICBzdHJpbmcgbmFtXG59XG5cbkNPTlRSQUNUX1JFVklFVyB7XG4gICAgc3RyaW5nIGlkXG4gICAgZW51bSBzdGF0dXNcbiAgICBudW1iZXIgc3RhdGVOdW1iZXJcbiAgICBlbnVtIHN0YXRlQ29kZVxuICAgIGRhdGUgbGFzdFN1Ym1pdHRlZEF0XG4gICAgZGF0ZSBjcmVhdGVkQXRcbiAgICBkYXRlIHVwZGF0ZWRBdFxuICAgIGZrZXkgcHJpbWFyeURNQ09SZXZpZXdlclxuICAgIGZrZXkgc2Vjb25kYXJ5RE1DT1Jldmlld2VyXG59XG5cbkNPTlRSQUNUX1NVQk1JU1NJT04ge1xuICAgIHN0cmluZyBpZFxuICAgIGZrZXkgY29udHJhY3RSZXZpZXdJRFxuICAgIGRhdGUgc3VibWl0dGVkQXRcbiAgICBkYXRlIGNyZWF0ZWRBdFxuICAgIGRhdGUgdXBkYXRlZEF0XG4gICAgYmluYXJ5IGNvbnRyYWN0RGF0YVxufVxuXG5DT05UUkFDVF9SRVZJRVcgfHwtLXx7IENPTlRSQUNUX1NVQk1JU1NJT046IFwiaGFzIG1hbnlcIlxuXG5SQVRFX1JFVklFVyB8fC0tfHsgUkFURV9TVUJNSVNTSU9OOiBcImhhcyBtYW55XCJcblxuQ09OVFJBQ1RfUkVWSUVXIHx8LS18byBSQVRFX1JFVklFVzogXCJoYXMgbWFueVwiXG5cbkNPTlRSQUNUX1NVQk1JU1NJT04gfHwtLXxvIFJBVEVfU1VCTUlTU0lPTjogXCJoYXMgbWFueVwiXG5cblJBVEVfUkVWSUVXIHtcbiAgICBzdHJpbmcgaWRcbiAgICBzdHJpbmcgY29udHJhY3RSZXZpZXdJRFxuICAgIGVudW0gc3RhdHVzXG4gICAgZmtleSBwcmltYXJ5RE1DUFJldmlld2VyXG4gICAgZmtleSBzZWNvbmRhcnlETUNQUmV2aWV3ZXJcbiAgICBma2V5IHByaW1hcnlPQUNUUmV2aXdlclxuICAgIGZrZXkgc2Vjb25kYXJ5T0FDVFJldmlld2VyXG59XG5cblJBVEVfU1VCTUlTU0lPTiB7XG4gICAgc3RyaW5nIGlkXG4gICAgZmtleSByYXRlUmV2aWV3SURcbiAgICBma2V5IGNvbnRyYWN0U3VibWlzc2lvbklEXG4gICAgYmluYXJ5IHJhdGVEYXRhXG59XG5cbkNPTlRSQUNUX1JFVklFVyB9fC0tfHsgUkVWSUVXRVI6IFwibWFueSB0byBtYW55XCJcblxuUkFURV9SRVZJRVcgfXwtLXx7IFJFVklFV0VSOiBcIm1hbnkgdG8gbWFueVwiXG5cblJFVklFV0VSIHtcbiAgICBzdHJpbmcgZXVhXG4gICAgc3RyaW5nIG5hbWVcbiAgICBlbnVtIGRlcGFydG1lbnRcbn1cbiIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkZWZhdWx0XCJcbn0iLCJ1cGRhdGVFZGl0b3IiOmZhbHNlLCJhdXRvU3luYyI6ZmFsc2UsInVwZGF0ZURpYWdyYW0iOnRydWV9
