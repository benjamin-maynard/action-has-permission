'use strict';

const assert = require('assertthat');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const core = require('@actions/core');

const checkPermission = require('../lib/checkPermission');

let repos;
let checkPermissionMock;

suite('checkPermission', () => {
  setup(async () => {
    repos = { getCollaboratorPermissionLevel: sinon.fake() };
    checkPermissionMock = proxyquire('../lib/checkPermission', {
      'actions-toolkit': {
        Toolkit: class Toolkit {
          constructor() {
            this.context = {
              actor: 'actor',
              repo: {
                owner: 'owner',
                repo: 'repo'
              }
            };
            this.github = { repos };
          }
        }
      }
    });
  });

  teardown(async () => {
    sinon.restore();
  });

  test('is a function.', async () => {
    return assert.that(checkPermission).is.ofType('function');
  });

  test('fails if invalid required permission is given.', async () => {
    const setFailedFake = sinon.fake();

    sinon.replace(core, 'setFailed', setFailedFake);
    sinon.replace(core, 'getInput', sinon.fake.returns('invalid'));

    const actual = await checkPermissionMock();

    assert.that(actual).is.falsy();
    assert.that(await setFailedFake.lastArg).is.equalTo('Required permission must be one of: none,read,write,admin');
  });

  test('checks collaborator via GitHub API.', async () => {
    sinon.replace(core, 'getInput', sinon.fake.returns('admin'));

    await checkPermissionMock();

    assert.that(repos.getCollaboratorPermissionLevel.lastArg).is.equalTo({
      owner: 'owner',
      repo: 'repo',
      username: 'actor'
    });
  });

  suite('returns falsy if', () => {
    test('an exception is thrown.', async () => {
      sinon.replace(core, 'getInput', sinon.fake.returns('admin'));
      repos.getCollaboratorPermissionLevel = sinon.fake.throws(new Error('foo'));

      const actual = await checkPermissionMock();

      assert.that(actual).is.falsy();
    });

    test('no permission is returned by GitHub.', async () => {
      sinon.replace(core, 'getInput', sinon.fake.returns('admin'));

      const actual = await checkPermissionMock();

      assert.that(actual).is.falsy();
    });

    test('permission of user is below "read".', async () => {
      const requiredPermission = 'read';
      sinon.replace(core, 'getInput', sinon.fake.returns(requiredPermission));

      const userPermission = 'none';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      const actual = await checkPermissionMock();
      assert.that(actual).is.falsy();
    });

    test('permission of user is below "write".', async () => {
      let userPermission;
      const requiredPermission = 'write';
      sinon.replace(core, 'getInput', sinon.fake.returns(requiredPermission));

      userPermission = 'none';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.falsy();

      userPermission = 'read';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.falsy();
    });

    test('permission of user is below "admin".', async () => {
      let userPermission;
      const requiredPermission = 'admin';
      sinon.replace(core, 'getInput', sinon.fake.returns(requiredPermission));

      userPermission = 'none';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.falsy();

      userPermission = 'read';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.falsy();

      userPermission = 'write';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.falsy();
    });
  });

  suite('returns "1" if', () => {
    test('permission of user is at least "read".', async () => {
      let userPermission;
      const requiredPermission = 'read';
      sinon.replace(core, 'getInput', sinon.fake.returns(requiredPermission));

      userPermission = 'read';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.equalTo('1');

      userPermission = 'write';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.equalTo('1');

      userPermission = 'admin';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.equalTo('1');
    });

    test('permission of user is at least "write".', async () => {
      let userPermission;
      const requiredPermission = 'write';
      sinon.replace(core, 'getInput', sinon.fake.returns(requiredPermission));

      userPermission = 'write';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.equalTo('1');

      userPermission = 'admin';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.equalTo('1');
    });

    test('permission of user is "admin".', async () => {
      const requiredPermission = 'admin';
      sinon.replace(core, 'getInput', sinon.fake.returns(requiredPermission));

      const userPermission = 'admin';
      repos.getCollaboratorPermissionLevel = sinon.fake.returns({ data: { permission: userPermission } });
      assert.that(await checkPermissionMock()).is.equalTo('1');
    });
  });
});
