BEGIN;

ALTER TABLE "Question" RENAME TO "ContractQuestion";

ALTER TABLE "QuestionDocument" RENAME TO "ContractQuestionDocument";

ALTER TABLE "QuestionResponse" RENAME TO "ContractQuestionResponse";

ALTER TABLE "QuestionResponseDocument" RENAME TO "ContractQuestionResponseDocument";

ALTER TABLE "ContractQuestionDocument" RENAME CONSTRAINT "QuestionDocument_questionID_fkey" TO "ContractQuestionDocument_questionID_fkey";
ALTER TABLE "ContractQuestionResponse" RENAME CONSTRAINT "QuestionResponse_questionID_fkey" TO "ContractQuestionResponse_questionID_fkey";
ALTER TABLE "ContractQuestionResponseDocument" RENAME CONSTRAINT "QuestionResponseDocument_responseID_fkey" TO "ContractQuestionResponseDocument_responseID_fkey";

ALTER TABLE "ContractQuestion" RENAME CONSTRAINT "Question_contractID_fkey" TO "ContractQuestion_contractID_fkey";

COMMIT;
