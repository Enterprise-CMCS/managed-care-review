// don't forget the | undefined here. The typesystem doesn't add it on its own
// so I immedately got errors without it, since often there is no state on a link.
export type MCRouterState =
    | {
          defaultProgramID: string | undefined
      }
    | undefined
