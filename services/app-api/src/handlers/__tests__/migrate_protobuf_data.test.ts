import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { runProtoMigration } from '../migrate_protobuf_data'
import { v4 as uuid44 } from 'uuid'

const mockHPPSubmission = () => {
    const hppID = uuid44()
    return {
        id: hppID,
        stateCode: 'MS',
        revisions: [
            {
                id: uuid44(),
                createdAt: '2022-07-15T20:02:39.741Z',
                formDataProto:
                    'ChBTVEFURV9TVUJNSVNTSU9OEAQaJDlkMThhZTYwLTk3OTktNGE2OS05N2QyLTEwYmIzNjliMTEyNyIJU1VCTUlUVEVEKgcI5g8QBRgRMgwIjoCrpgYQwMWB6AI6DAj+lMeWBhCA3demAkgaUAFaJGUwODE5MTUzLTU4OTQtNDE1My05MzdlLWFhZDAwYWIwMWE4ZmADavYFVGhlIE1pc3Npc3NpcHBpIERpdmlzaW9uIG9mIE1lZGljYWlkIGlzIHN1Ym1pdHRpbmcgdG8gdGhlIENlbnRlcnMgZm9yIE1lZGljYXJlIGFuZCBNZWRpY2FpZCBTZXJ2aWNlcyAoQ01TKSwgdGhlIGV4ZWN1dGVkIE1pc3Npc3NpcHBpIENvb3JkaW5hdGVkIEFjY2VzcyBOZXR3b3JrIChNaXNzaXNzaXBwaUNBTikgQW1lbmRtZW50ICMxMyBmb3IgYWxsIG1hbmFnZWQgY2FyZSBvcmdhbml6YXRpb25zIChNYWdub2xpYSBIZWFsdGggUGxhbiwgSW5jLjsgTW9saW5hIEhlYWx0aGNhcmUgb2YgTVMsIEluYy47IGFuZCBVbml0ZWRIZWFsdGhjYXJlIG9mIE1TLCBJbmMpLiAgQW1lbmRtZW50ICMxMyB1cGRhdGVzIGFsbCBtYW5hZ2VkIGNhcmUgY29udHJhY3RzIHRvIHJlZmxlY3QgY2hhbmdlcyAoaW5jbHVkaW5nIGFkZGl0aW9uIGFuZCBkZWxldGlvbiBvZiB2ZXJiaWFnZSkgZm9yIHRoZSBmb2xsb3dpbmcgY29udHJhY3Qgc2VjdGlvbnM6IFByb3ZpZGVyIENyZWRlbnRpYWxpbmcgYW5kIFF1YWxpZmljYXRpb25zOyBRdWFsaXR5IE1hbmFnZW1lbnQ7IFJlcG9ydGluZyBSZXF1aXJlbWVudHM7IENhcGl0YXRpb24gUmF0ZXM7IENhcGl0YXRpb24gUGF5bWVudHM7IEZpbmFuY2lhbCBSZXF1aXJlbWVudHM7IERlZmF1bHQgYW5kIFRlcm1pbmF0aW9uOyBhbmQgQ2xhaW1zIE1hbmFnZW1lbnQuICBUaGlzIGFtZW5kbWVudCBpbmNsdWRlcyByaXNrIG1pdGlnYXRpb24gZG9jdW1lbnRhdGlvbiBmb3Igc3RhdGUgZmlzY2FsIHllYXIgKFNGWSkgMjAyMy5ySAoLQXByaWwgQnVybnMSHFByb2plY3QgTWFuYWdlbWVudCBUZWFtIExlYWQaG2FwcmlsLmJ1cm5zQG1lZGljYWlkLm1zLmdvdnJTCg9LZWl0aCBIZWFydHNpbGwSH0hlYWx0aGNhcmUgRmluYW5jaWFsIENvbnN1bHRhbnQaH0tlaXRoLkhlYXJ0c2lsbEBtZWRpY2FpZC5tcy5nb3ZyWAoTTWlzc2lzc2lwcGlDQU4gUGxhbhIcR2VuZXJhbCBNYW5hZ2VkIENhcmUgTWFpbGJveBojTWlzc2lzc2lwcGlDQU4uUGxhbkBtZWRpY2FpZC5tcy5nb3ZyOgoJTGlzYSBTaGF3EhJBY2NvdW50aW5nIE1hbmFnZXIaGWxpc2Euc2hhd0BtZWRpY2FpZC5tcy5nb3Z6yQYIAhIHCOYPEAYYARoHCOcPEAUYHiIBASoBATKCAgo0TWFnbm9saWEgSGVhbHRoIFBsYW5fTVNDQU5fQW1lbmRtZW50IDEzX0V4ZWN1dGVkLnBkZhKEAXMzOi8vdXBsb2Fkcy1wcm9kLXVwbG9hZHMtNzAxNzg5NDcyMDU3L2E3ODMzYTc0LTkwMDUtNDlkYi04MjczLTNmYTlhMGMzNGEyNS5wZGYvTWFnbm9saWEgSGVhbHRoIFBsYW5fTVNDQU5fQW1lbmRtZW50IDEzX0V4ZWN1dGVkLnBkZhoBASJANzg0YWZkZTRlNDgxODg4OWZhZjM4MTgzY2IxMjliYzZjNDliZWNiMzU3MzI1ODJmMzY2YTc4YzBjYjNiY2Y1YTL8AQoxTW9saW5hIEhlYWx0aGNhcmUgb2YgTWlzc2lzc2lwcGlfQ0NPX0FtZW5kIDEzLnBkZhKBAXMzOi8vdXBsb2Fkcy1wcm9kLXVwbG9hZHMtNzAxNzg5NDcyMDU3LzUwMzdlOGU1LTg4OWQtNDM5NC05OGU1LWM4M2YzZDgzMmQzOC5wZGYvTW9saW5hIEhlYWx0aGNhcmUgb2YgTWlzc2lzc2lwcGlfQ0NPX0FtZW5kIDEzLnBkZhoBASJAY2Q0MTk4Yjk1NmQ1OTMwYzJlOGQ3NDcyM2JkNjAzM2Y3NDY0YzcyMTdhODAxNzk5YjU4ZjNkMjc5MzkyYjE2MDKAAgozVW5pdGVkSGVhbHRoIENhcmUgb2YgTVNfTVNDQU5fQW1lbmQgMTNfRXhlY3V0ZWQucGRmEoMBczM6Ly91cGxvYWRzLXByb2QtdXBsb2Fkcy03MDE3ODk0NzIwNTcvYTljMTgyYjctNDY0NS00MmRjLTkyYTAtZjdhM2VkODZiZDRmLnBkZi9Vbml0ZWRIZWFsdGggQ2FyZSBvZiBNU19NU0NBTl9BbWVuZCAxM19FeGVjdXRlZC5wZGYaAQEiQGMyZGM3NzExOWYyZjU4ZGFiM2Q5NzM4YzY3NGI1NmU0MWFjMTk5OTc3ZWU2MzEwNTFkYmQ3YzNmZDQ3NTY0MmI4AZIDIyIhCAAQABgAIAEoADABOAFAAEgAUABYAGAAaABwAHgAgAEAggHsAQopTVMgQ0FOIHYuIDEgMDQyNTIwMjIgQW1lbmQuIDEzIEZpbmFsLnhsc3gSenMzOi8vdXBsb2Fkcy1wcm9kLXVwbG9hZHMtNzAxNzg5NDcyMDU3L2YzZTdhNzg5LWIzYjMtNDE0Yi1hZDdmLWJlYzdiYzBjYzZiNS54bHN4L01TIENBTiB2LiAxIDA0MjUyMDIyIEFtZW5kLiAxMyBGaW5hbC54bHN4GgEDIkAwNTY3NWIzYTIzZDE5MjY0ZjBmZTI2YmQwOTQ1YzYzOWRmMDZiMzUyYjg2NmRlNjc5OTBkZGM1NWU3NjVhNWIxggGWAgo+VW5pdGVkIEhlYWx0aGNhcmVfTVNDQU5fMjAxNzA3MjZfQ29udHJhY3Qgd2l0aCBBbWVuZHMgMS0xMy5wZGYSjgFzMzovL3VwbG9hZHMtcHJvZC11cGxvYWRzLTcwMTc4OTQ3MjA1Ny9kN2Y5OWMzMy03NzQwLTRjYmUtOTMzMi01MmViYmE1NDVkZGYucGRmL1VuaXRlZCBIZWFsdGhjYXJlX01TQ0FOXzIwMTcwNzI2X0NvbnRyYWN0IHdpdGggQW1lbmRzIDEtMTMucGRmGgEDIkBlMTc2NTJlYzUxMDNjZDcyNTk5NDE4ODk2ZGU1YTM5MWI0OGYyZDQ1ZmQxNDIyODYwMDIwOGQ1NjU2NjhmM2Y1ggGWAgo+TW9saW5hIEhlYWx0aGNhcmVfTVNDQU4tMjAxNzA3MjZfQ29udHJhY3Qgd2l0aCBBbWVuZHMgMS0xMy5wZGYSjgFzMzovL3VwbG9hZHMtcHJvZC11cGxvYWRzLTcwMTc4OTQ3MjA1Ny9iZDhjNWI2My1mMTRlLTQ1MzktYjgwMC1mYmQ5ZTRkYjFkMmYucGRmL01vbGluYSBIZWFsdGhjYXJlX01TQ0FOLTIwMTcwNzI2X0NvbnRyYWN0IHdpdGggQW1lbmRzIDEtMTMucGRmGgEDIkAyZjlkN2Y2NjM1YjUwM2JlZjY2YWM5M2NiNmZmNmYyYzU5MGJmMjMzNjcyZGY0OGQ3Y2YxYmYxNTQ5ZTlkOTllggGcAgpBTWFnbm9saWEgSGVhbHRoIFBsYW5fTVNDQU5fMjAxNzA3MjZfQ29udHJhY3Qgd2l0aCBBbWVuZHMgMS0xMy5wZGYSkQFzMzovL3VwbG9hZHMtcHJvZC11cGxvYWRzLTcwMTc4OTQ3MjA1Ny8wNTBhNzMxOC1hOTg5LTRlODgtYWFlMS0zYThmYzk5ZGM5Y2MucGRmL01hZ25vbGlhIEhlYWx0aCBQbGFuX01TQ0FOXzIwMTcwNzI2X0NvbnRyYWN0IHdpdGggQW1lbmRzIDEtMTMucGRmGgEDIkA2MzYzNzBjNzJiMGQ4ZTVmNzdlZGJmYjdjZmRlZTlkNjZhZTJjMDdhZGNkYWFmMjk4OTg4MzcxMGQ2OTA1OTdiigFRCksKDUppbGwgQnJ1Y2tlcnQSHlByaW5jaXBhbCAmIENvbnN1bHRpbmcgQWN0dWFyeRoaamlsbC5icnVja2VydEBtaWxsaW1hbi5jb20QAhoAkAECkgOBBwokZDMzZGVjMTItMDY0Yy00NzdiLWFlZjUtODdkOGZlM2E5ZGM5EAEaBwjmDxAGGAEiBwjnDxAFGB4qBwjmDxADGBQyUApKCg9LYXRhcmluYSBMb3JlbnoSGVNlbmlvciBDb25zdWx0aW5nIEFjdHVhcnkaHGthdGFyaW5hLmxvcmVuekBtaWxsaW1hbi5jb20QAhoAMlEKSwoNSmlsbCBCcnVja2VydBIeUHJpbmNpcGFsICYgQ29uc3VsdGluZyBBY3R1YXJ5GhpqaWxsLmJydWNrZXJ0QG1pbGxpbWFuLmNvbRACGgA4AkLfAQojTVNDQU4gQW1lbiAxMyBFeGhpYml0IDEgVXBkYXRlZC5wZGYSc3MzOi8vdXBsb2Fkcy1wcm9kLXVwbG9hZHMtNzAxNzg5NDcyMDU3L2EwMTg4MTNkLWFiNDYtNDRlOC1iZGQ2LWM3OTk5ZTZmYTA5Ni5wZGYvTVNDQU4gQW1lbiAxMyBFeGhpYml0IDEgVXBkYXRlZC5wZGYaAQIiQGY2ZTY0Nzk4NjRiMzMxM2M0NzNhZGU2ZTEyMGJiZjM3NWM4YzdjZWNjYTZhMDEzMmU3NTNkYzMzMTFmOGJhYTRCyQIKV0NvcHkgb2YgUmVwb3J0MDUgLSBTRlkgMjAyMyBQcmVsaW1pbmFyeSBNaXNzaXNzaXBwaUNBTiBDYXBpdGF0aW9uIFJhdGVzIC0gRXhoaWJpdHMueGxzeBKoAXMzOi8vdXBsb2Fkcy1wcm9kLXVwbG9hZHMtNzAxNzg5NDcyMDU3LzgwOGZmYjQ3LTI5M2ItNDFjZC05NTdmLTFhZjRiNjkzM2FiOC54bHN4L0NvcHkgb2YgUmVwb3J0MDUgLSBTRlkgMjAyMyBQcmVsaW1pbmFyeSBNaXNzaXNzaXBwaUNBTiBDYXBpdGF0aW9uIFJhdGVzIC0gRXhoaWJpdHMueGxzeBoBAiJANjBmNzgzZWVlZjM0ZmM5ZGQ3MDhiYWQxZDc2ZjIxNDVlMWE5N2I4OGRlMTMwMTM1MTA5MDNhMTgyOGMzNDEyMkgBUiRlMDgxOTE1My01ODk0LTQxNTMtOTM3ZS1hYWQwMGFiMDFhOGZaP01DUi1NUy0wMDAxLU1TQ0FOLVJBVEUtMjAyMjA3MDEtMjAyMzA2MzAtQ0VSVElGSUNBVElPTi0yMDIyMDQyMA==', //pragma: allowlist secret
                formData: null,
                submittedAt: '2022-07-15T20:13:50.618Z',
                unlockedAt: '2022-07-15T20:02:39.737Z',
                unlockedBy: 'mara.siler-price@cms.hhs.gov',
                unlockedReason:
                    'Mississippi will be submitting an additional document supporting their contract amendment.  ',
                submittedBy: 'april.burns@medicaid.ms.gov',
                submittedReason:
                    "The supporting documentation was submitted following CMS' request for a version of the base MSCAN contract that integrates all of the subsequent amendments that have been made to it.",
            },
            {
                id: uuid44(),
                createdAt: '2022-06-17T18:13:31.771Z',
                formDataProto:
                    'ChBTVEFURV9TVUJNSVNTSU9OEAQaJDlkMThhZTYwLTk3OTktNGE2OS05N2QyLTEwYmIzNjliMTEyNyIJU1VCTUlUVEVEKgcI5g8QBRgRMgwIlYCrpgYQgIe5ggI6CwiImbOVBhDAl984SBpQAVokZTA4MTkxNTMtNTg5NC00MTUzLTkzN2UtYWFkMDBhYjAxYThmYANq9gVUaGUgTWlzc2lzc2lwcGkgRGl2aXNpb24gb2YgTWVkaWNhaWQgaXMgc3VibWl0dGluZyB0byB0aGUgQ2VudGVycyBmb3IgTWVkaWNhcmUgYW5kIE1lZGljYWlkIFNlcnZpY2VzIChDTVMpLCB0aGUgZXhlY3V0ZWQgTWlzc2lzc2lwcGkgQ29vcmRpbmF0ZWQgQWNjZXNzIE5ldHdvcmsgKE1pc3Npc3NpcHBpQ0FOKSBBbWVuZG1lbnQgIzEzIGZvciBhbGwgbWFuYWdlZCBjYXJlIG9yZ2FuaXphdGlvbnMgKE1hZ25vbGlhIEhlYWx0aCBQbGFuLCBJbmMuOyBNb2xpbmEgSGVhbHRoY2FyZSBvZiBNUywgSW5jLjsgYW5kIFVuaXRlZEhlYWx0aGNhcmUgb2YgTVMsIEluYykuICBBbWVuZG1lbnQgIzEzIHVwZGF0ZXMgYWxsIG1hbmFnZWQgY2FyZSBjb250cmFjdHMgdG8gcmVmbGVjdCBjaGFuZ2VzIChpbmNsdWRpbmcgYWRkaXRpb24gYW5kIGRlbGV0aW9uIG9mIHZlcmJpYWdlKSBmb3IgdGhlIGZvbGxvd2luZyBjb250cmFjdCBzZWN0aW9uczogUHJvdmlkZXIgQ3JlZGVudGlhbGluZyBhbmQgUXVhbGlmaWNhdGlvbnM7IFF1YWxpdHkgTWFuYWdlbWVudDsgUmVwb3J0aW5nIFJlcXVpcmVtZW50czsgQ2FwaXRhdGlvbiBSYXRlczsgQ2FwaXRhdGlvbiBQYXltZW50czsgRmluYW5jaWFsIFJlcXVpcmVtZW50czsgRGVmYXVsdCBhbmQgVGVybWluYXRpb247IGFuZCBDbGFpbXMgTWFuYWdlbWVudC4gIFRoaXMgYW1lbmRtZW50IGluY2x1ZGVzIHJpc2sgbWl0aWdhdGlvbiBkb2N1bWVudGF0aW9uIGZvciBzdGF0ZSBmaXNjYWwgeWVhciAoU0ZZKSAyMDIzLnJICgtBcHJpbCBCdXJucxIcUHJvamVjdCBNYW5hZ2VtZW50IFRlYW0gTGVhZBobYXByaWwuYnVybnNAbWVkaWNhaWQubXMuZ292clMKD0tlaXRoIEhlYXJ0c2lsbBIfSGVhbHRoY2FyZSBGaW5hbmNpYWwgQ29uc3VsdGFudBofS2VpdGguSGVhcnRzaWxsQG1lZGljYWlkLm1zLmdvdnJYChNNaXNzaXNzaXBwaUNBTiBQbGFuEhxHZW5lcmFsIE1hbmFnZWQgQ2FyZSBNYWlsYm94GiNNaXNzaXNzaXBwaUNBTi5QbGFuQG1lZGljYWlkLm1zLmdvdnI6CglMaXNhIFNoYXcSEkFjY291bnRpbmcgTWFuYWdlchoZbGlzYS5zaGF3QG1lZGljYWlkLm1zLmdvdnrJBggCEgcI5g8QBhgBGgcI5w8QBRgeIgEBKgEBMoICCjRNYWdub2xpYSBIZWFsdGggUGxhbl9NU0NBTl9BbWVuZG1lbnQgMTNfRXhlY3V0ZWQucGRmEoQBczM6Ly91cGxvYWRzLXByb2QtdXBsb2Fkcy03MDE3ODk0NzIwNTcvYTc4MzNhNzQtOTAwNS00OWRiLTgyNzMtM2ZhOWEwYzM0YTI1LnBkZi9NYWdub2xpYSBIZWFsdGggUGxhbl9NU0NBTl9BbWVuZG1lbnQgMTNfRXhlY3V0ZWQucGRmGgEBIkA3ODRhZmRlNGU0ODE4ODg5ZmFmMzgxODNjYjEyOWJjNmM0OWJlY2IzNTczMjU4MmYzNjZhNzhjMGNiM2JjZjVhMvwBCjFNb2xpbmEgSGVhbHRoY2FyZSBvZiBNaXNzaXNzaXBwaV9DQ09fQW1lbmQgMTMucGRmEoEBczM6Ly91cGxvYWRzLXByb2QtdXBsb2Fkcy03MDE3ODk0NzIwNTcvNTAzN2U4ZTUtODg5ZC00Mzk0LTk4ZTUtYzgzZjNkODMyZDM4LnBkZi9Nb2xpbmEgSGVhbHRoY2FyZSBvZiBNaXNzaXNzaXBwaV9DQ09fQW1lbmQgMTMucGRmGgEBIkBjZDQxOThiOTU2ZDU5MzBjMmU4ZDc0NzIzYmQ2MDMzZjc0NjRjNzIxN2E4MDE3OTliNThmM2QyNzkzOTJiMTYwMoACCjNVbml0ZWRIZWFsdGggQ2FyZSBvZiBNU19NU0NBTl9BbWVuZCAxM19FeGVjdXRlZC5wZGYSgwFzMzovL3VwbG9hZHMtcHJvZC11cGxvYWRzLTcwMTc4OTQ3MjA1Ny9hOWMxODJiNy00NjQ1LTQyZGMtOTJhMC1mN2EzZWQ4NmJkNGYucGRmL1VuaXRlZEhlYWx0aCBDYXJlIG9mIE1TX01TQ0FOX0FtZW5kIDEzX0V4ZWN1dGVkLnBkZhoBASJAYzJkYzc3MTE5ZjJmNThkYWIzZDk3MzhjNjc0YjU2ZTQxYWMxOTk5NzdlZTYzMTA1MWRiZDdjM2ZkNDc1NjQyYjgBkgMjIiEIABAAGAAgASgAMAE4AUAASABQAFgAYABoAHAAeACAAQCCAewBCilNUyBDQU4gdi4gMSAwNDI1MjAyMiBBbWVuZC4gMTMgRmluYWwueGxzeBJ6czM6Ly91cGxvYWRzLXByb2QtdXBsb2Fkcy03MDE3ODk0NzIwNTcvZjNlN2E3ODktYjNiMy00MTRiLWFkN2YtYmVjN2JjMGNjNmI1Lnhsc3gvTVMgQ0FOIHYuIDEgMDQyNTIwMjIgQW1lbmQuIDEzIEZpbmFsLnhsc3gaAQMiQDA1Njc1YjNhMjNkMTkyNjRmMGZlMjZiZDA5NDVjNjM5ZGYwNmIzNTJiODY2ZGU2Nzk5MGRkYzU1ZTc2NWE1YjGKAVEKSwoNSmlsbCBCcnVja2VydBIeUHJpbmNpcGFsICYgQ29uc3VsdGluZyBBY3R1YXJ5GhpqaWxsLmJydWNrZXJ0QG1pbGxpbWFuLmNvbRACGgCQAQKSA4EHCiRmMmJkZmQ0NS1lNDllLTRiNjMtYjIyZS02ZTFhMTI1YTE1ZjQQARoHCOYPEAYYASIHCOcPEAUYHioHCOYPEAMYFDJQCkoKD0thdGFyaW5hIExvcmVuehIZU2VuaW9yIENvbnN1bHRpbmcgQWN0dWFyeRoca2F0YXJpbmEubG9yZW56QG1pbGxpbWFuLmNvbRACGgAyUQpLCg1KaWxsIEJydWNrZXJ0Eh5QcmluY2lwYWwgJiBDb25zdWx0aW5nIEFjdHVhcnkaGmppbGwuYnJ1Y2tlcnRAbWlsbGltYW4uY29tEAIaADgCQt8BCiNNU0NBTiBBbWVuIDEzIEV4aGliaXQgMSBVcGRhdGVkLnBkZhJzczM6Ly91cGxvYWRzLXByb2QtdXBsb2Fkcy03MDE3ODk0NzIwNTcvYTAxODgxM2QtYWI0Ni00NGU4LWJkZDYtYzc5OTllNmZhMDk2LnBkZi9NU0NBTiBBbWVuIDEzIEV4aGliaXQgMSBVcGRhdGVkLnBkZhoBAiJAZjZlNjQ3OTg2NGIzMzEzYzQ3M2FkZTZlMTIwYmJmMzc1YzhjN2NlY2NhNmEwMTMyZTc1M2RjMzMxMWY4YmFhNELJAgpXQ29weSBvZiBSZXBvcnQwNSAtIFNGWSAyMDIzIFByZWxpbWluYXJ5IE1pc3Npc3NpcHBpQ0FOIENhcGl0YXRpb24gUmF0ZXMgLSBFeGhpYml0cy54bHN4EqgBczM6Ly91cGxvYWRzLXByb2QtdXBsb2Fkcy03MDE3ODk0NzIwNTcvODA4ZmZiNDctMjkzYi00MWNkLTk1N2YtMWFmNGI2OTMzYWI4Lnhsc3gvQ29weSBvZiBSZXBvcnQwNSAtIFNGWSAyMDIzIFByZWxpbWluYXJ5IE1pc3Npc3NpcHBpQ0FOIENhcGl0YXRpb24gUmF0ZXMgLSBFeGhpYml0cy54bHN4GgECIkA2MGY3ODNlZWVmMzRmYzlkZDcwOGJhZDFkNzZmMjE0NWUxYTk3Yjg4ZGUxMzAxMzUxMDkwM2ExODI4YzM0MTIySAFSJGUwODE5MTUzLTU4OTQtNDE1My05MzdlLWFhZDAwYWIwMWE4Zlo/TUNSLU1TLTAwMDEtTVNDQU4tUkFURS0yMDIyMDcwMS0yMDIzMDYzMC1DRVJUSUZJQ0FUSU9OLTIwMjIwNDIw', //pragma: allowlist secret
                formData: null,
                submittedAt: '2022-06-17T18:48:40.119Z',
                unlockedAt: null,
                unlockedBy: null,
                unlockedReason: null,
                submittedBy: 'april.burns@medicaid.ms.gov',
                submittedReason: 'Initial submission',
            },
        ],
    }
}

it('migrate protobuf data and updates db', async () => {
    const prisma = await sharedTestPrismaClient()
    try {
        await prisma.$transaction(async (tx) => {
            const testSubmission = mockHPPSubmission()
            const insertedSubmission = await tx.healthPlanPackageTable.create({
                data: {
                    ...testSubmission,
                    revisions: {
                        create: testSubmission.revisions.map((rev) => ({
                            ...rev,
                            formDataProto: Buffer.from(
                                rev.formDataProto,
                                'base64'
                            ),
                            formData: undefined,
                        })),
                    },
                },
                include: {
                    revisions: true,
                },
            })

            // validate our test data correctly saved formDataProto
            expect(
                Buffer.from(
                    insertedSubmission.revisions[0].formDataProto
                ).toString('base64')
            ).toEqual(testSubmission.revisions[0].formDataProto)

            // run the migration
            await runProtoMigration(tx, 'test')

            const validateMigration = await tx.healthPlanPackageTable.findFirst(
                {
                    where: {
                        id: testSubmission.id,
                    },
                    include: {
                        revisions: true,
                    },
                }
            )

            if (!validateMigration) {
                throw new Error(
                    'Test failed: submission not found after migration'
                )
            }

            const rev1 = validateMigration?.revisions[0]
            const rev2 = validateMigration?.revisions[0]

            // Validate formData was populated
            expect(rev1.formData).toBeTruthy()
            expect(rev2.formData).toBeTruthy()

            // Validate the data was decoded
            expect(rev1.formData).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    contractDocuments: expect.any(Array),
                })
            )

            expect(rev2.formData).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    contractDocuments: expect.any(Array),
                })
            )

            throw new Error('Test passed: rolling back db')
        })
    } catch (e) {
        if (e.message == 'Test passed: rolling back db') {
            console.info('Test passed: rolling back db')
        } else {
            console.info(e)
            throw new Error(e)
        }
    }
})

it('migrate protobuf data and updates db and sanitizes data on val', async () => {
    const prisma = await sharedTestPrismaClient()
    try {
        await prisma.$transaction(async (tx) => {
            const testSubmission = mockHPPSubmission()
            const insertedSubmission = await tx.healthPlanPackageTable.create({
                data: {
                    ...testSubmission,
                    revisions: {
                        create: testSubmission.revisions.map((rev) => ({
                            ...rev,
                            formDataProto: Buffer.from(
                                rev.formDataProto,
                                'base64'
                            ),
                            formData: undefined,
                        })),
                    },
                },
                include: {
                    revisions: true,
                },
            })

            // validate our test data correctly saved formDataProto
            expect(
                Buffer.from(
                    insertedSubmission.revisions[0].formDataProto
                ).toString('base64')
            ).toEqual(testSubmission.revisions[0].formDataProto)

            // run the migration
            await runProtoMigration(tx, 'val')

            const validateMigration = await tx.healthPlanPackageTable.findFirst(
                {
                    where: {
                        id: testSubmission.id,
                    },
                    include: {
                        revisions: true,
                    },
                }
            )

            if (!validateMigration) {
                throw new Error(
                    'Test failed: submission not found after migration'
                )
            }

            const rev1 = validateMigration?.revisions[0]
            const rev2 = validateMigration?.revisions[0]

            // Validate formData was populated
            expect(rev1.formData).toBeTruthy()
            expect(rev2.formData).toBeTruthy()

            const formData1 = rev1.formData as any
            const formData2 = rev1.formData as any

            // Validate the data was decoded
            expect(rev1).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    unlockedBy: expect.stringMatching(/^[\w.-]+@example\.com$/),
                })
            )

            // validate some sanitization
            expect(formData1.contractDocuments).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: expect.stringMatching(
                            /^s3:\/\/uploads-sanitized\/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\.pdf\//
                        ),
                    }),
                ])
            )

            // validate some sanitization
            expect(formData1.stateContacts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        email: expect.stringMatching(/^[\w.-]+@example\.com$/),
                    }),
                ])
            )

            // Validate the data was decoded
            expect(rev2).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    unlockedBy: expect.stringMatching(/^[\w.-]+@example\.com$/),
                })
            )

            // validate some sanitization
            expect(formData2.contractDocuments).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: expect.stringMatching(
                            /^s3:\/\/uploads-sanitized\/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\.pdf\//
                        ),
                    }),
                ])
            )

            // validate some sanitization
            expect(formData2.stateContacts).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        email: expect.stringMatching(/^[\w.-]+@example\.com$/),
                    }),
                ])
            )

            throw new Error('Test passed: rolling back db')
        })
    } catch (e) {
        if (e.message == 'Test passed: rolling back db') {
            console.info('Test passed: rolling back db')
        } else {
            console.info(e)
            throw new Error(e)
        }
    }
})

it('throws error on failed migration', async () => {
    const prisma = await sharedTestPrismaClient()
    const testSubmission = mockHPPSubmission()

    // place creating test submission in transaction so we can roll back creation
    try {
        await prisma.$transaction(async (tx) => {
            await tx.healthPlanPackageTable.create({
                data: {
                    ...testSubmission,
                    revisions: {
                        create: [
                            {
                                ...testSubmission.revisions[0],
                                formDataProto: Buffer.from(
                                    'THIS SHOULD FAIL',
                                    'base64'
                                ),
                                formData: undefined,
                            },
                        ],
                    },
                },
                include: {
                    revisions: true,
                },
            })

            // run the migration
            await runProtoMigration(tx, 'test')
        })
    } catch (e) {
        expect(e.message).toContain(
            'Protobuf migration failed: Error decoding formDataProto'
        )
    }
})
