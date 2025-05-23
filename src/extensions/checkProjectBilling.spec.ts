import * as chai from "chai";
chai.use(require("chai-as-promised"));
import * as sinon from "sinon";

import * as checkProjectBilling from "./checkProjectBilling";
import * as prompt from "../prompt";
import * as cloudbilling from "../gcp/cloudbilling";

const expect = chai.expect;

describe("checkProjectBilling", () => {
  let confirmStub: sinon.SinonStub;
  let selectStub: sinon.SinonStub;
  let checkBillingEnabledStub: sinon.SinonStub;
  let listBillingAccountsStub: sinon.SinonStub;
  let setBillingAccountStub: sinon.SinonStub;

  beforeEach(() => {
    confirmStub = sinon.stub(prompt, "confirm");
    selectStub = sinon.stub(prompt, "select");

    checkBillingEnabledStub = sinon.stub(cloudbilling, "checkBillingEnabled");
    checkBillingEnabledStub.resolves();

    listBillingAccountsStub = sinon.stub(cloudbilling, "listBillingAccounts");
    listBillingAccountsStub.resolves();

    setBillingAccountStub = sinon.stub(cloudbilling, "setBillingAccount");
    setBillingAccountStub.resolves();
  });

  afterEach(() => {
    confirmStub.restore();
    selectStub.restore();
    checkBillingEnabledStub.restore();
    listBillingAccountsStub.restore();
    setBillingAccountStub.restore();
  });

  it("should resolve if billing enabled", async () => {
    const projectId = "already enabled";

    checkBillingEnabledStub.resolves(true);

    const enabled = await cloudbilling.checkBillingEnabled(projectId);
    if (!enabled) {
      await checkProjectBilling.enableBilling(projectId);
    }

    expect(listBillingAccountsStub.notCalled);
    expect(setBillingAccountStub.notCalled);
    expect(confirmStub.notCalled);
    expect(selectStub.notCalled);
  });

  it("should list accounts if no billing account set, but accounts available.", async () => {
    const projectId = "not set, but have list";
    const accounts = [
      {
        name: "test-cloud-billing-account-name",
        open: true,
        displayName: "test-account",
      },
    ];

    checkBillingEnabledStub.resolves(false);
    listBillingAccountsStub.resolves(accounts);
    setBillingAccountStub.resolves(true);
    selectStub.resolves("test-account");

    const enabled = await cloudbilling.checkBillingEnabled(projectId);
    if (!enabled) {
      await checkProjectBilling.enableBilling(projectId);
    }

    expect(listBillingAccountsStub.calledOnce);
    expect(setBillingAccountStub.calledOnce);
    expect(setBillingAccountStub.calledWith(projectId, "test-cloud-billing-account-name"));
  });

  it("should not list accounts if no billing accounts set or available.", async () => {
    const projectId = "not set, not available";

    checkBillingEnabledStub.onCall(0).resolves(false);
    checkBillingEnabledStub.onCall(1).resolves(true);
    listBillingAccountsStub.resolves([]);

    const enabled = await cloudbilling.checkBillingEnabled(projectId);
    if (!enabled) {
      await checkProjectBilling.enableBilling(projectId);
    }

    expect(listBillingAccountsStub.calledOnce);
    expect(setBillingAccountStub.notCalled);
    expect(checkBillingEnabledStub.callCount).to.equal(2);
  });
});
