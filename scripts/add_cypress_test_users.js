var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import AWS from 'aws-sdk';
function getUserPoolID(stageName) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var uiAuthStackName, cf, describe, userPoolID;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    uiAuthStackName = "ui-auth-" + stageName;
                    cf = new AWS.CloudFormation({
                        apiVersion: '2016-04-19',
                        region: 'us-east-1',
                    });
                    return [4 /*yield*/, cf
                            .describeStacks({ StackName: uiAuthStackName })
                            .promise()];
                case 1:
                    describe = _b.sent();
                    if (describe.Stacks === undefined) {
                        throw new Error('got back nothing');
                    }
                    userPoolID = (_a = describe.Stacks[0].Outputs) === null || _a === void 0 ? void 0 : _a.filter(function (o) { return o.OutputKey === 'UserPoolId'; })[0].OutputValue;
                    if (userPoolID === undefined) {
                        throw new Error("No UserPoolID defined in " + uiAuthStackName);
                    }
                    return [2 /*return*/, userPoolID];
            }
        });
    });
}
// these are the exact roles as they are set by IDM
function IDMRole(role) {
    switch (role) {
        case 'CMS_USER':
            return 'macmcrrs-cms-user';
        case 'STATE_USER':
            return 'macmcrrs-state-user';
        case 'UNKNOWN_USER':
            return 'foo-bar-user';
    }
}
function createUser(_a) {
    var userPoolID = _a.userPoolID, name = _a.name, email = _a.email, role = _a.role, password = _a.password, state = _a.state;
    return __awaiter(this, void 0, void 0, function () {
        var cognito, userProps, e_1, passwordParams;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    cognito = new AWS.CognitoIdentityServiceProvider({
                        apiVersion: '2016-04-19',
                        region: 'us-east-1',
                    });
                    userProps = {
                        UserPoolId: userPoolID,
                        Username: email,
                        MessageAction: 'SUPPRESS',
                        //TemporaryPassword: 'Password!1',
                        DesiredDeliveryMediums: ['EMAIL'],
                        UserAttributes: [
                            {
                                Name: 'given_name',
                                Value: name,
                            },
                            {
                                Name: 'family_name',
                                Value: 'TestLastName',
                            },
                            {
                                Name: 'email',
                                Value: email,
                            },
                            {
                                Name: 'custom:role',
                                Value: IDMRole(role),
                            },
                        ],
                    };
                    // only set state for STATE_USERS
                    if (state) {
                        userProps.UserAttributes.push({
                            Name: 'custom:state_code',
                            Value: state,
                        });
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, cognito.adminCreateUser(userProps).promise()];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    // swallow username exists errors. this script is meant to be run repeatedly.
                    if (e_1.code !== 'UsernameExistsException') {
                        throw e_1;
                    }
                    return [3 /*break*/, 4];
                case 4:
                    passwordParams = {
                        Password: password,
                        UserPoolId: userPoolID,
                        Username: email,
                        Permanent: true,
                    };
                    return [4 /*yield*/, cognito.adminSetUserPassword(passwordParams).promise()];
                case 5:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var stageName, testUserPassword, excludedStages, userPoolID, e_2, testUsers, _i, testUsers_1, user, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('INFO: Create Test Users');
                    stageName = process.argv[2];
                    testUserPassword = process.argv[3];
                    excludedStages = ['main', 'val', 'prod'];
                    if (excludedStages.includes(stageName)) {
                        console.log('ERROR: Will not set test cognito users in this stage');
                        process.exit(1);
                    }
                    userPoolID = '';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, getUserPoolID(stageName)];
                case 2:
                    userPoolID = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    console.log('Error fetching User Pool ID: ', e_2);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4:
                    console.log('INFO: Got UserPoolID');
                    testUsers = [
                        {
                            name: 'Aang',
                            email: 'aang@dhs.state.mn.us',
                            role: 'STATE_USER',
                            state: 'MN',
                        },
                        {
                            name: 'Toph',
                            email: 'toph@dmas.virginia.gov',
                            role: 'STATE_USER',
                            state: 'VA',
                        },
                        {
                            name: 'Zuko',
                            email: 'zuko@cms.hhs.gov',
                            role: 'CMS_USER',
                            state: undefined,
                        },
                        {
                            name: 'Cabbages',
                            email: 'cabbages@example.com',
                            role: 'UNKNOWN_USER',
                            state: undefined,
                        },
                    ];
                    _i = 0, testUsers_1 = testUsers;
                    _a.label = 5;
                case 5:
                    if (!(_i < testUsers_1.length)) return [3 /*break*/, 10];
                    user = testUsers_1[_i];
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 8, , 9]);
                    console.log('Creating User:', user.name);
                    return [4 /*yield*/, createUser({
                            userPoolID: userPoolID,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            password: testUserPassword,
                            state: user.state,
                        })];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 8:
                    e_3 = _a.sent();
                    console.log('Error creating user: ', e_3);
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9:
                    _i++;
                    return [3 /*break*/, 5];
                case 10: return [2 /*return*/];
            }
        });
    });
}
main();
//# sourceMappingURL=add_cypress_test_users.js.map